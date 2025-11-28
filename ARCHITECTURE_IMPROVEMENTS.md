# Electron Architecture - Suggested Improvements

## Critical Security Issues

### 1. Raw IPC Renderer Exposure (HIGH PRIORITY)
**Issue**: `electron/preload.ts:6-23` exposes raw `ipcRenderer` with unrestricted channel access.

```typescript
// CURRENT (UNSAFE):
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    return ipcRenderer.invoke(channel, ...omit)
  }
})
```

**Risk**: Renderer can invoke ANY IPC channel, including undocumented or future channels.

**Recommendation**: Remove raw ipcRenderer exposure entirely. All IPC should go through typed, specific APIs like `window.alinea`, `window.chat`, etc.

```typescript
// REMOVE the entire window.ipcRenderer exposure
// Keep only domain-specific APIs (window.alinea, window.chat, etc.)
```

### 2. Missing Input Validation
**Issue**: IPC handlers in `electron/main.ts` don't validate inputs.

**Risk**:
- Empty project names could be created
- Invalid IDs could cause file system errors
- No sanitization of file paths (potential path traversal)

**Recommendation**: Add validation layer before file operations:

```typescript
// Add validation functions
function validateProjectId(id: string): void {
  if (!id || !/^project-\d+$/.test(id)) {
    throw new Error('Invalid project ID format');
  }
}

function validateStoryId(id: string): void {
  if (!id || !/^story-\d+$/.test(id)) {
    throw new Error('Invalid story ID format');
  }
}

function validateName(name: string, maxLength = 100): void {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length === 0) {
    throw new Error('Name cannot be empty');
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Name too long (max ${maxLength} characters)`);
  }
}

// Use in handlers:
ipcMain.handle('projects:create', async (_event, name: string) => {
  validateName(name);
  return createProject(name);
});
```

### 3. Path Traversal Vulnerability
**Issue**: `electron/fs/alineaFs.ts` constructs file paths using user-provided IDs without sanitization.

**Recommendation**: Validate IDs don't contain path separators:

```typescript
function sanitizeId(id: string): string {
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw new Error('Invalid ID: contains path separators');
  }
  return id;
}
```

## Type Safety Improvements

### 4. Incomplete Type Definitions
**Issue**: `src/global.d.ts` is missing types for several APIs exposed in preload:
- `window.settings` (getApiKey, setApiKey, clearApiKey)
- `window.theme` (get, onChange)
- metaDocs methods (loadStoryMetaDoc, saveStoryMetaDoc, loadRootMetaDoc, saveRootMetaDoc)

**Recommendation**: Complete the type definitions to match preload.ts exactly:

```typescript
// Add to src/global.d.ts
declare global {
  interface Window {
    alinea: {
      // ... existing methods ...
      loadStoryMetaDoc: (projectId: string, storyId: string, key: string) => Promise<any>;
      saveStoryMetaDoc: (projectId: string, storyId: string, key: string, doc: any) => Promise<{ ok: boolean }>;
      loadRootMetaDoc: (key: string) => Promise<any>;
      saveRootMetaDoc: (key: string, doc: any) => Promise<{ ok: boolean }>;
      loadManifest: () => Promise<ManifestData>;
      saveManifest: (payload: ManifestData) => Promise<{ ok: boolean }>;
    };

    chat: {
      send: (payload: { messages: { role: string; content: string }[] }) => Promise<{
        ok: boolean;
        output_text?: string;
        error?: string;
        raw?: unknown;
      }>;
    };

    settings: {
      getApiKey: () => Promise<string | null>;
      setApiKey: (key: string) => Promise<void>;
      clearApiKey: () => Promise<{ ok: boolean }>;
    };

    theme: {
      get: () => Promise<'dark' | 'light'>;
      onChange: (callback: (theme: 'dark' | 'light') => void) => void;
    };

    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
```

### 5. Any Types in Preload
**Issue**: `electron/preload.ts` uses `any` for payload types (lines 38, 51-52, 55, 67-68, 73-74, 83).

**Recommendation**: Import and use proper types from a shared types file:

```typescript
// Create electron/types.ts
export type { ProjectMeta, StoryMeta, StoryFile, ManifestData } from './fs/alineaFs';
export type { JSONContent } from '@tiptap/react';

// Use in preload.ts
import type { ProjectMeta, StoryFile, ManifestData, JSONContent } from './types';
```

## Code Organization

### 6. Side-Effect Import Pattern
**Issue**: `electron/main.ts:6` imports chat.ts for side effects (`import './chat'`).

**Problem**: Makes dependencies unclear and order-dependent.

**Recommendation**: Explicitly initialize modules:

```typescript
// electron/main.ts
import { registerChatHandlers } from './chat';
import { registerSettingsHandlers } from './settings';
import { registerProjectHandlers } from './handlers/projects';
import { registerStoryHandlers } from './handlers/stories';

app.whenReady().then(() => {
  registerSettingsHandlers();
  registerChatHandlers();
  registerProjectHandlers();
  registerStoryHandlers();
  createWindow();
});
```

### 7. Monolithic Main Process
**Issue**: All 50+ IPC handlers are in `electron/main.ts` (lines 94-236).

**Recommendation**: Split into domain-specific handler files:

```
electron/
  handlers/
    projects.ts      # Project CRUD handlers
    stories.ts       # Story CRUD handlers
    metaDocs.ts      # MetaDoc handlers
    settings.ts      # Settings handlers (move from main.ts)
  main.ts            # Window management + initialization only
  chat.ts
  preload.ts
  fs/
    alineaFs.ts
```

Example `electron/handlers/projects.ts`:
```typescript
import { ipcMain } from 'electron';
import { listProjects, createProject, updateProject, deleteProject, reorderProjects } from '../fs/alineaFs';

export function registerProjectHandlers() {
  ipcMain.handle('projects:list', async () => listProjects());

  ipcMain.handle('projects:create', async (_event, name: string) => {
    // validation here
    return createProject(name);
  });

  // ... other handlers
}
```

## Error Handling

### 8. Inconsistent Error Responses
**Issue**: Some handlers return `{ ok: true }`, others return data directly, errors are inconsistent.

**Recommendation**: Standardize error handling with a wrapper:

```typescript
// electron/utils/ipcHandler.ts
export function safeHandle<T>(
  channel: string,
  handler: (...args: any[]) => Promise<T>
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(...args);
      return { ok: true, data: result };
    } catch (error) {
      console.error(`[${channel}] Error:`, error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

// Usage:
safeHandle('projects:create', async (name: string) => {
  validateName(name);
  return createProject(name);
});
```

### 9. Silent File System Failures
**Issue**: `electron/fs/alineaFs.ts` has many empty catch blocks that return `[]` or `null`.

**Recommendation**: Log errors and distinguish between "not found" vs "read error":

```typescript
export async function listProjects(): Promise<ProjectMeta[]> {
  const dir = getProjectsDir();
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    // ... process entries
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // Directory doesn't exist yet - this is expected on first run
      return [];
    }
    // Unexpected error - log it
    console.error('Failed to list projects:', err);
    throw new Error('Failed to read projects directory');
  }
}
```

## Performance Improvements

### 10. Excessive File I/O
**Issue**: Autosave triggers every 800-1000ms, causing frequent disk writes.

**Recommendation**:
1. Increase debounce time to 2-3 seconds
2. Only write if content actually changed (deep comparison)
3. Consider write coalescing (batch multiple changes)

```typescript
// In App.tsx, increase timeout:
const timeout = setTimeout(() => {
  // ... save logic
}, 2000); // was 800ms
```

### 11. No Caching for Projects/Stories Lists
**Issue**: Every list operation reads from disk, even if data hasn't changed.

**Recommendation**: Implement in-memory cache with file watching:

```typescript
// electron/fs/cache.ts
import { watch } from 'fs/promises';

class DataCache {
  private projectsCache: ProjectMeta[] | null = null;
  private storiesCache: Map<string, StoryMeta[]> = new Map();

  constructor() {
    this.watchProjectsDir();
  }

  async getProjects(): Promise<ProjectMeta[]> {
    if (this.projectsCache === null) {
      this.projectsCache = await this.loadProjectsFromDisk();
    }
    return this.projectsCache;
  }

  invalidateProjects() {
    this.projectsCache = null;
  }

  // ... similar for stories
}
```

### 12. Story Files Rewritten Entirely on Partial Update
**Issue**: Saving outline/brief rewrites the entire story file, including unchanged prose doc.

**Current**: App.tsx lines 600-633 saves entire StoryFile even when only outline changed.

**Recommendation**: Already structured well with metaDocs, but ensure autosave only writes dirty fields.

## Production Concerns

### 13. DevTools Open in Production
**Issue**: `electron/main.ts:82` - DevTools are opened even in production build.

```typescript
// CURRENT:
win.loadFile(path.join(RENDERER_DIST, 'index.html'));
win.webContents.openDevTools(); // ← This should not be in production
```

**Recommendation**:
```typescript
if (VITE_DEV_SERVER_URL) {
  win.loadURL(VITE_DEV_SERVER_URL);
  win.webContents.openDevTools();
} else {
  win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  // NO devTools in production
}
```

### 14. No App Menu
**Issue**: `autoHideMenuBar: true` in main.ts:60, but no custom menu provided.

**Recommendation**: Add application menu with File/Edit/View/Help:

```typescript
import { Menu, shell } from 'electron';

function createAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => {
          // Send to renderer
        }},
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    // ... more menu items
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

### 15. No Crash Reporting or Logging
**Issue**: No structured logging, no crash reporting.

**Recommendation**: Add electron-log and electron-updater:

```typescript
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Use throughout app
log.info('App starting...');
```

## Data Integrity

### 16. Race Conditions in Concurrent Saves
**Issue**: Multiple autosave timers can trigger simultaneously (prose + outline + brief).

**Scenario**: User types in prose (triggers autosave), then quickly switches to outline and types (triggers second autosave). Both timers fire at ~same time, both read old file, both write - last write wins, one set of changes lost.

**Recommendation**: Implement write queue:

```typescript
// electron/fs/writeQueue.ts
class WriteQueue {
  private queue: Map<string, Promise<void>> = new Map();

  async enqueue(key: string, operation: () => Promise<void>): Promise<void> {
    const existing = this.queue.get(key);

    const newPromise = (existing || Promise.resolve())
      .then(operation)
      .finally(() => {
        if (this.queue.get(key) === newPromise) {
          this.queue.delete(key);
        }
      });

    this.queue.set(key, newPromise);
    return newPromise;
  }
}

export const writeQueue = new WriteQueue();

// Usage in alineaFs.ts:
export async function saveStory(...args) {
  const key = `story:${projectId}:${storyId}`;
  return writeQueue.enqueue(key, async () => {
    // ... actual save logic
  });
}
```

### 17. No File Backup or Version History
**Issue**: Autosave overwrites immediately. If corrupted data is saved, no recovery.

**Recommendation**: Keep last N versions:

```typescript
// Before writing story-123.json, rename current to story-123.json.1
// Rotate up to story-123.json.5
// Clean up old versions after successful write
```

## API Design

### 18. Duplicate Manifest APIs
**Issue**: Both `loadManifest()` and `loadRootMetaDoc('manifest')` do the same thing.

**Recommendation**: Deprecate direct manifest API, use only metaDocs API:

```typescript
// Mark as deprecated in preload
/** @deprecated Use loadRootMetaDoc('manifest') instead */
loadManifest: () => ipcRenderer.invoke('alinea:loadManifest'),
```

Then eventually remove after client code is migrated.

### 19. Inconsistent Return Types
**Issue**: Some handlers return `{ ok: boolean }`, some return data directly.

**Current**:
- `createProject` returns `Project`
- `deleteProject` returns `{ ok: boolean }`
- `saveStory` returns `{ ok: boolean }`
- `loadStory` returns `StoryData`

**Recommendation**: Standardize - data operations return data, mutations return `{ ok: true }` on success or throw error.

## Testing Gaps

### 20. No Unit Tests for File Operations
**Recommendation**: Add tests for alineaFs.ts:

```typescript
// electron/fs/__tests__/alineaFs.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { vol } from 'memfs';

jest.mock('fs/promises', () => require('memfs').promises);

describe('alineaFs', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should create a new project', async () => {
    const project = await createProject('Test Project');
    expect(project.name).toBe('Test Project');
    expect(project.id).toMatch(/^project-\d+$/);
  });

  // ... more tests
});
```

## Summary of Priority

**High Priority (Security & Data Integrity)**:
1. Remove raw IPC renderer exposure (#1)
2. Add input validation (#2, #3)
3. Fix race conditions in saves (#16)
4. Remove DevTools in production (#13)

**Medium Priority (Stability & Maintainability)**:
5. Complete type definitions (#4, #5)
6. Standardize error handling (#8, #9)
7. Split handlers into modules (#7)
8. Fix duplicate APIs (#18)

**Low Priority (Nice to Have)**:
9. Add caching (#11)
10. Add app menu (#14)
11. Add logging (#15)
12. Add tests (#20)
13. Reduce autosave frequency (#10)
14. Add backup/versioning (#17)
