# Export System Documentation

## Overview

Distil's export system allows users to export stories to various formats (currently DOCX, with PDF planned). The export process runs entirely in the Electron main process for optimal performance and to leverage Node.js capabilities not available in the browser.

## Architecture

### Main Process vs Renderer Process

**Renderer Process (Browser)**:
- Initiates export via menu (Cmd/Ctrl+Shift+E)
- Shows progress modal
- Handles user feedback

**Main Process (Electron)**:
- Merges story parts
- Shows native save dialog
- Generates DOCX file
- Writes to filesystem

This architecture was chosen because:
1. **Performance**: Node.js Buffer handling is faster than browser Uint8Array conversion
2. **Compatibility**: `Packer.toBuffer()` only works in Node.js (browser requires `toBlob()`)
3. **Native dialogs**: Better integration with OS file system
4. **Memory efficiency**: Large documents handled in main process

## DOCX Export Flow

```
User triggers export (menu)
  ↓
App.tsx handles menu:export event
  ↓
exportOrchestrator.exportStory()
  ↓
IPC: export:exportToDocx(projectId, storyId)
  ↓
MAIN PROCESS:
  ├─ mergeStoryParts() - Load and merge all parts
  ├─ showSaveDialog() - Native file picker
  ├─ exportToDocx() - Generate DOCX buffer
  │   ├─ createProseMirrorSchema() - TipTap extensions
  │   ├─ Convert JSONContent to ProseMirror Nodes
  │   ├─ customDocxSerializer.serialize() - Critical!
  │   └─ Packer.toBuffer()
  └─ fs.writeFile() - Save to disk
  ↓
Return success/cancelled/error
  ↓
Update progress modal
```

## Key Implementation Details

### TipTap to prosemirror-docx Node Name Mappings

**The Problem**: TipTap uses camelCase node names (`hardBreak`, `codeBlock`) while prosemirror-docx expects snake_case (`hard_break`, `code_block`). This causes serialization to fail silently.

**The Solution**: Custom serializer with explicit mappings:

```typescript
const customDocxSerializer = new DocxSerializer(
  {
    ...defaultNodes,

    // TipTap: hardBreak → prosemirror-docx: hard_break
    hardBreak(state) {
      state.addRunOptions({ break: 1 });
    },

    // TipTap: codeBlock → prosemirror-docx: code_block
    codeBlock(state, node) {
      state.renderContent(node);
      state.closeBlock(node);
    },

    // TipTap: horizontalRule → prosemirror-docx: horizontal_rule
    horizontalRule(state, node) {
      state.closeBlock(node, { thematicBreak: true });
      state.closeBlock(node);
    },

    // TipTap: orderedList → prosemirror-docx: ordered_list
    orderedList(state, node) {
      state.renderList(node, 'numbered');
    },

    // TipTap: bulletList → prosemirror-docx: bullet_list
    bulletList(state, node) {
      state.renderList(node, 'bullets');
    },

    // TipTap: listItem → prosemirror-docx: list_item
    listItem(state, node) {
      state.renderListItem(node);
    },
  },
  defaultMarks
);
```

### The Critical Sections Array Issue

**The Bug**: Exported DOCX files were completely empty despite:
- File being created (7456 bytes)
- Console showing 76 paragraphs being rendered
- Serializers being called correctly

**Root Cause**: The `buildDoc` function in prosemirror-docx checks `if (!sections)` to decide whether to use `state.sections` or fall back to `state.children`:

```javascript
// In prosemirror-docx buildDoc():
let sections = state?.sections?.map(...);
if (!sections) {  // Empty array [] is truthy in JavaScript!
    sections = [{ children: state?.children || [] }];
}
```

When `state.sections` is an empty array `[]`, it's truthy, so the fallback never happens. But the empty array has no content, resulting in a blank document.

**The Fix**: Explicitly return a sections array with `state.children` in the serialize callback:

```typescript
const wordDocument = customDocxSerializer.serialize(
  finalDoc,
  {
    getImageBuffer: (src: string): Uint8Array => {
      console.warn('[Export] Image export not yet implemented:', src);
      return new Uint8Array();
    },
  },
  (state) => {
    // CRITICAL: Must explicitly return sections with state.children
    // because state.sections is an empty array [] (truthy)
    return {
      numbering: {
        config: state.numbering,
      },
      sections: [
        {
          properties: {},
          children: state.children, // Content is here!
        },
      ],
    };
  }
);
```

### Schema Compatibility

The export uses the same TipTap extensions as the prose editor to ensure schema compatibility:

```typescript
function createProseMirrorSchema(): Schema {
  const extensions = [
    StarterKit.configure({
      heading: false, // We'll add Heading explicitly
    }),
    Heading.configure({
      levels: [2, 3], // Match prose editor config
    }),
    Placeholder.configure({
      placeholder: '',
    }),
  ];

  // Use TipTap's built-in schema generator
  return getSchema(extensions);
}
```

**Important**: The schema only supports heading levels 2 and 3. Level 1 headings will cause errors.

## Story Merging

Multi-part stories are merged in `electron/handlers/export.ts`:

```typescript
export async function mergeStoryParts(
  projectId: string,
  storyId: string
): Promise<MergedStory> {
  // 1. Load story metadata
  const metadataResponse = await client.loadStoryMetadata(projectId, storyId);
  const metadata = metadataResponse.data;

  // 2. Sort parts by order
  const parts = metadata.parts || [];
  const sortedParts = [...parts].sort((a, b) => a.order - b.order);

  // 3. Load each part's document
  const partResults = await Promise.all(
    sortedParts.map(async (part, index) => {
      const response = await client.loadPartDoc(projectId, storyId, part.id);
      const content = response.data.doc.content ?? [];

      return {
        partId: part.id,
        partIndex: index,
        partTitle: getPartTitle(index, sortedParts.length),
        content: { type: 'doc', content } as JSONContent,
      };
    })
  );

  return {
    title: metadata.title,
    parts: partResults.filter(p => p !== null),
    metadata,
  };
}
```

Chapter titles are generated as "Kapitel 1", "Kapitel 2", etc. (only when there's more than one part).

## Menu Integration

### Dynamic Menu System

The menu system is context-aware and updates based on current navigation:

```typescript
// In App.tsx
useEffect(() => {
  const isStoryContext = appSection === 'story';
  window.menu.updateContext({
    isStoryContext,
    projectId: selectedProjectId || undefined,
    storyId: selectedStoryId || undefined,
  });
}, [appSection, selectedProjectId, selectedStoryId]);
```

### Export Menu Items

```typescript
// In electron/appMenu.ts
{
  label: 'Export',
  submenu: [
    {
      label: 'Export as DOCX...',
      enabled: context.isStoryContext, // Only enabled when viewing a story
      accelerator: 'CmdOrCtrl+Shift+E',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('menu:export', 'docx');
        }
      },
    },
    {
      label: 'Export as PDF...',
      enabled: false, // Not yet implemented
      accelerator: 'CmdOrCtrl+Shift+P',
    },
  ],
}
```

### Event Listener Cleanup

**Critical**: Must properly clean up event listeners to prevent multiple dialogs stacking:

```typescript
// In App.tsx
useEffect(() => {
  const handleExport = async (format: 'docx' | 'pdf') => {
    // ... export logic
  };

  const cleanup = window.menu.onExport(handleExport);

  // CRITICAL: Return cleanup function
  return () => {
    if (cleanup) cleanup();
  };
}, [selectedProjectId, selectedStoryId]);
```

## Progress Modal

The export progress modal shows three states:

1. **Loading**: Non-closable, shows spinner
2. **Complete**: Auto-closes after 1.5s, can be manually closed
3. **Error**: Can be manually closed, shows error message

```typescript
const canClose = status === 'error' || status === 'complete';

<BaseModal
  opened={opened}
  onClose={canClose ? onClose : () => {}}
  closeOnClickOutside={canClose}
  closeOnEscape={canClose}
  size="sm"
  overlayPreset="glassStrong"
>
```

## Adding Support for New Node Types

To add support for a new TipTap node type:

1. **Add to schema** (if not part of StarterKit):
```typescript
function createProseMirrorSchema(): Schema {
  const extensions = [
    StarterKit.configure({ /* ... */ }),
    YourNewExtension.configure({ /* ... */ }),
  ];
  return getSchema(extensions);
}
```

2. **Add serializer mapping**:
```typescript
const customDocxSerializer = new DocxSerializer(
  {
    ...defaultNodes,
    yourNewNode(state, node) {
      // Implement serialization logic
      state.renderContent(node);
      state.closeBlock(node);
    },
  },
  defaultMarks
);
```

3. **Test with sample content** containing the new node type

## Adding New Export Formats

To add a new export format (e.g., PDF):

1. **Add IPC handler** in `electron/handlers/export.ts`:
```typescript
async function exportStoryToPdf(projectId: string, storyId: string) {
  const mergedStory = await mergeStoryParts(projectId, storyId);
  const filePath = await showSaveDialog(mergedStory.title, 'pdf');
  if (!filePath) return { success: false, cancelled: true };

  // Generate PDF (e.g., using webContents.printToPDF)
  const buffer = await generatePdf(mergedStory);
  await fs.writeFile(filePath, buffer);

  return { success: true, filePath };
}

safeHandle('export:exportToPdf', async (projectId, storyId) => {
  validateProjectId(projectId);
  validateStoryId(storyId);
  return await exportStoryToPdf(projectId, storyId);
});
```

2. **Add to client** in `src/api/client.ts`:
```typescript
exportToPdf(projectId: string, storyId: string) {
  return window.distil.exportToPdf(projectId, storyId);
}
```

3. **Add to menu** in `electron/appMenu.ts`:
```typescript
{
  label: 'Export as PDF...',
  enabled: context.isStoryContext,
  accelerator: 'CmdOrCtrl+Shift+P',
  click: () => {
    windows[0].webContents.send('menu:export', 'pdf');
  },
}
```

4. **Update orchestrator** in `src/export/exportOrchestrator.ts`:
```typescript
if (format === 'pdf') {
  onProgress({ status: 'loading' });
  const response = await client.exportToPdf(projectId, storyId);
  // ... handle response
}
```

## Known Issues

### Layout Issue: No Paragraph Spacing

**Problem**: Paragraphs have no spacing before them, making text appear cramped.

**Status**: Identified, not yet fixed.

**Context**:
- Previous issue where every paragraph ended up on its own page was fixed after migrating to prosemirror-docx
- Current implementation uses default paragraph spacing (none)
- Affects readability but document is functional

**Possible solutions**:
- Add `spacingBefore` property to paragraph serializer (e.g., 200 twentieths of a point = 10pt)
- Configure default paragraph styles in document options
- Add spacing parameters to `state.closeBlock()` calls

**Example fix**:
```typescript
paragraph(state, node) {
  state.renderInline(node);
  state.closeBlock(node, {
    spacingBefore: 200, // 10pt spacing before paragraph
    spacingAfter: 0,
  });
}
```

**Next steps**:
- Research prosemirror-docx and docx library documentation for spacing options
- Test different spacing values in Word, Pages, and LibreOffice
- Consider making spacing configurable (future export options feature)

## File Structure

```
electron/
├── export/
│   └── docxExporter.ts        # DOCX generation logic
├── handlers/
│   └── export.ts               # IPC handlers for export (includes story merging)
├── appMenu.ts                  # Dynamic menu with export options
└── preload.ts                  # IPC method exposure

src/
├── models/
│   └── export.ts               # Export type definitions
├── export/
│   └── exportOrchestrator.ts   # Export flow orchestration
├── ui/
│   ├── editor/
│   │   └── primitives/
│   │       └── editorConfigFactory.tsx  # getProseExtensions()
│   └── modals/
│       └── ExportProgressModal.tsx  # Progress UI
├── api/
│   └── client.ts               # Export IPC client methods
└── global.d.ts                 # TypeScript type definitions
```

## Dependencies

- **prosemirror-docx** (^0.6.5): ProseMirror to DOCX serialization
- **docx** (^8.5.0): Peer dependency for DOCX generation
- **@tiptap/core**: Schema generation
- **@tiptap/starter-kit**: Basic editor nodes
- **@tiptap/extension-heading**: Heading support
- **prosemirror-model**: Document node types
