# Electron Architecture - Suggested Improvements

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

## Data Integrity


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
