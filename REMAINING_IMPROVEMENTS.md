# Remaining Architecture Improvements

## ✅ Completed

### High Priority (Security & Data Integrity)
- ✅ #1 - Removed raw IPC renderer exposure
- ✅ #2 - Added comprehensive input validation
- ✅ #3 - Added path sanitization
- ✅ #13 - Removed DevTools in production

### Medium Priority (Stability & Maintainability)
- ✅ #4 - Completed type definitions
- ✅ #6 - Refactored side-effect imports
- ✅ #7 - Split monolithic main process into modules

---

## 🔴 HIGH PRIORITY - Data Integrity Risk

### #16 - Race Conditions in Concurrent Saves
**Status**: Not addressed
**Risk**: Data loss when multiple autosaves trigger simultaneously

**Issue**: Multiple autosave timers (prose + outline + brief) can fire at the same time. Both read the old file, both write - last write wins, one set of changes lost.

**Example Scenario**:
1. User types in prose → triggers autosave timer (1000ms)
2. User switches to outline and types → triggers second autosave timer (800ms)
3. Both timers fire nearly simultaneously
4. Both read the current story file
5. Both write back with their changes
6. Last write wins, other changes are lost

**Recommendation**: Implement write queue to serialize saves

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

// Use in alineaFs.ts:
export async function saveStory(...args) {
  const key = `story:${projectId}:${storyId}`;
  return writeQueue.enqueue(key, async () => {
    // ... actual save logic
  });
}
```

**Effort**: 2-3 hours
**Impact**: Prevents data loss

---

## 🟡 MEDIUM PRIORITY - Stability

### #8 - Inconsistent Error Responses
**Status**: Not addressed
**Issue**: Some handlers return `{ ok: true }`, others return data directly, errors are inconsistent

**Current State**:
- `createProject()` returns `Project`
- `deleteProject()` returns `{ ok: boolean }`
- `saveStory()` returns `{ ok: boolean }`
- Errors sometimes thrown, sometimes returned as `{ ok: false, error: ... }`

**Recommendation**: Standardize error handling with wrapper

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
```

**Effort**: 3-4 hours (need to update all handlers and renderer code)
**Impact**: Consistent error handling throughout app

---

### #9 - Silent File System Failures
**Status**: Partially addressed (validation added, but catches still silent)

**Issue**: Many empty catch blocks return `[]` or `null` without logging

**Current** (in alineaFs.ts):
```typescript
try {
  const entries = await fs.readdir(dir);
  // ... process
} catch {
  return []; // Silent failure - could be ENOENT or permission error
}
```

**Recommendation**: Distinguish between expected and unexpected errors

```typescript
try {
  const entries = await fs.readdir(dir);
  // ... process
} catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    // Expected - directory doesn't exist yet
    return [];
  }
  // Unexpected error - log it
  console.error('Failed to list projects:', err);
  throw new Error('Failed to read projects directory');
}
```

**Effort**: 1-2 hours
**Impact**: Better debugging and error visibility

---

### #5 - Any Types in Preload
**Status**: Not addressed
**Issue**: `electron/preload.ts` uses `any` for several parameters

**Lines with `any`**:
- Line 38: `updates: any`
- Line 51-52: `payload: any`
- Line 55: `updates: any`
- Line 67-68: `doc: any`
- Line 73-74: `doc: any`

**Recommendation**: Import proper types from shared types file

```typescript
// electron/types.ts (create)
export type { ProjectMeta, StoryFile, ManifestData } from './fs/alineaFs';
export type { JSONContent } from '@tiptap/react';

// Use in preload.ts
import type { StoryFile, ManifestData, JSONContent } from './types';

updateProject: (id: string, updates: Partial<Pick<ProjectMeta, 'name'>>) => { ... }
```

**Effort**: 1 hour
**Impact**: Better type safety, catches errors at compile time

---

### #18 - Duplicate Manifest APIs
**Status**: Not addressed
**Issue**: Both `loadManifest()` and `loadRootMetaDoc('manifest')` exist

**Recommendation**: Deprecate direct manifest API

```typescript
// In preload.ts, add deprecation comment
/** @deprecated Use loadRootMetaDoc('manifest') instead */
loadManifest: () => ipcRenderer.invoke('alinea:loadManifest'),
```

Then plan to remove after client code migrates.

**Effort**: 30 minutes (documentation) + 2 hours (migration)
**Impact**: Cleaner API surface

---

### #19 - Inconsistent Return Types
**Status**: Not addressed (related to #8)
**Issue**: Some operations return data, some return `{ ok: boolean }`

See #8 for details.

---

## 🟢 LOW PRIORITY - Nice to Have

### #10 - Excessive File I/O
**Status**: Not addressed
**Issue**: Autosave triggers every 800-1000ms

**Recommendation**:
1. Increase debounce to 2-3 seconds
2. Only write if content actually changed (deep comparison)
3. Consider write coalescing

**Effort**: 1-2 hours
**Impact**: Reduced disk wear, better performance

---

### #11 - No Caching for Projects/Stories Lists
**Status**: Not addressed
**Issue**: Every list operation reads from disk

**Recommendation**: Add in-memory cache with file watching

```typescript
// electron/fs/cache.ts
import { watch } from 'fs/promises';

class DataCache {
  private projectsCache: ProjectMeta[] | null = null;

  async getProjects(): Promise<ProjectMeta[]> {
    if (this.projectsCache === null) {
      this.projectsCache = await this.loadProjectsFromDisk();
    }
    return this.projectsCache;
  }

  invalidateProjects() {
    this.projectsCache = null;
  }
}
```

**Effort**: 3-4 hours
**Impact**: Faster list operations

---

### #14 - No App Menu
**Status**: Not addressed
**Issue**: `autoHideMenuBar: true` but no custom menu

**Recommendation**: Add File/Edit/View/Help menu

```typescript
import { Menu } from 'electron';

const template = [
  {
    label: 'File',
    submenu: [
      { label: 'New Project', accelerator: 'CmdOrCtrl+N' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  { label: 'Edit', submenu: [/* standard edit menu */] },
  // ...
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
```

**Effort**: 2-3 hours
**Impact**: Better UX, keyboard shortcuts

---

### #15 - No Crash Reporting or Logging
**Status**: Not addressed
**Issue**: No structured logging or crash reports

**Recommendation**: Add electron-log

```typescript
import log from 'electron-log';

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

log.info('App starting...');
```

**Effort**: 1-2 hours
**Impact**: Better debugging in production

---

### #17 - No File Backup or Version History
**Status**: Not addressed
**Issue**: Autosave overwrites immediately, no recovery

**Recommendation**: Keep last N versions

```typescript
// Before writing story-123.json, rename current to story-123.json.1
// Rotate up to story-123.json.5
```

**Effort**: 2-3 hours
**Impact**: Data recovery capability

---

### #20 - No Unit Tests
**Status**: Not addressed
**Issue**: No automated tests for file operations

**Recommendation**: Add tests with vitest + memfs

```typescript
// electron/handlers/__tests__/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { vol } from 'memfs';

jest.mock('fs/promises', () => require('memfs').promises);

describe('Project handlers', () => {
  it('should create a project', async () => {
    // ...
  });
});
```

**Effort**: 4-6 hours for basic coverage
**Impact**: Confidence in refactoring

---

## Summary by Priority

| Priority | Items | Total Effort | Status |
|----------|-------|--------------|--------|
| HIGH | 1 item (#16) | 2-3 hours | ⚠️ Not started |
| MEDIUM | 5 items (#5, #8, #9, #18, #19) | 8-10 hours | ⚠️ Not started |
| LOW | 6 items (#10, #11, #14, #15, #17, #20) | 13-19 hours | ⚠️ Not started |

## Recommended Order

1. **#16 - Write Queue** (HIGH) - Prevents data loss
2. **#9 - Error Logging** (MEDIUM) - Easy win, better debugging
3. **#5 - Type Safety in Preload** (MEDIUM) - Quick improvement
4. **#8 - Standardize Error Handling** (MEDIUM) - Foundation for stability
5. **#18 - Deprecate Duplicate APIs** (MEDIUM) - Clean up technical debt
6. Rest can be tackled as needed

## Notes

- Items #1-7, #13 are complete ✅
- Item #16 (race conditions) is the most important remaining issue
- Items #8 and #19 are related and should be done together
- Low priority items are "nice to have" but not critical
