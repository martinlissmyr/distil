# Code Organization - Refactoring Completed

## Summary

Successfully refactored the monolithic `electron/main.ts` into well-organized, domain-specific handler modules. The main process code is now **64% smaller** and much easier to maintain.

## Changes Overview

### Before
- **main.ts**: 265 lines - contained ALL IPC handlers inline
- **chat.ts**: Side-effect import with implicit registration
- No handler organization
- Difficult to navigate and maintain

### After
- **main.ts**: 94 lines (-171 lines, -64%)
  - Only window management and initialization
  - Clean registration of handlers
  - Explicit dependency flow

- **New modular structure**:
  ```
  electron/
    handlers/
      settings.ts      (API key management)
      projects.ts      (Project CRUD)
      stories.ts       (Story CRUD)
      metaDocs.ts      (MetaDocs + Manifest)
      theme.ts         (Theme detection)
    chat.ts            (OpenAI chat - refactored)
    main.ts            (Window + initialization)
  ```

## File Details

### 1. `electron/handlers/settings.ts` (680 bytes)
Handles application settings and secure API key storage.

**Exports:**
- `registerSettingsHandlers()`

**IPC Channels:**
- `settings:setApiKey` - Store OpenAI API key securely
- `settings:getApiKey` - Retrieve stored API key
- `settings:clearApiKey` - Remove API key from storage

**Validation:**
- API key format validation (must start with "sk-")

---

### 2. `electron/handlers/projects.ts` (1,295 bytes)
Handles all project-related operations.

**Exports:**
- `registerProjectHandlers()`

**IPC Channels:**
- `projects:list` - List all projects
- `projects:create` - Create new project
- `projects:update` - Update project name
- `projects:delete` - Delete project and all its data
- `projects:reorder` - Reorder projects

**Validation:**
- Project ID format (alphanumeric + dash + underscore)
- Project name (non-empty, max 200 chars)
- Path traversal prevention

---

### 3. `electron/handlers/stories.ts` (2,347 bytes)
Handles all story-related operations within projects.

**Exports:**
- `registerStoryHandlers()`

**IPC Channels:**
- `stories:list` - List stories in a project
- `story:create` - Create new story
- `story:load` - Load story content
- `story:save` - Save story (prose + metaDocs)
- `story:update` - Update story metadata
- `story:delete` - Delete story
- `stories:reorder` - Reorder stories within project

**Validation:**
- Project ID and Story ID validation
- Title validation
- Ensures consistency between project and story

---

### 4. `electron/handlers/metaDocs.ts` (2,101 bytes)
Handles flexible metadata documents (brief, outline, manifest, etc.)

**Exports:**
- `registerMetaDocHandlers()`

**IPC Channels:**
- `alinea:loadManifest` - Load manifest (legacy API)
- `alinea:saveManifest` - Save manifest (legacy API)
- `storyMeta:load` - Load story-level metaDoc
- `storyMeta:save` - Save story-level metaDoc
- `rootMeta:load` - Load root-level metaDoc
- `rootMeta:save` - Save root-level metaDoc

**Validation:**
- MetaDoc key validation (alphanumeric + dash + underscore)
- JSON document validation
- Project/Story ID validation for scoped metaDocs

**Notes:**
- Manifest API maintained for backward compatibility
- MetaDocs system is the recommended approach going forward

---

### 5. `electron/handlers/theme.ts` (871 bytes)
Handles system theme detection and change notifications.

**Exports:**
- `registerThemeHandlers()` - Registers IPC handler
- `setupThemeChangeListener()` - Sets up theme change broadcasting

**IPC Channels:**
- `theme:get` - Get current system theme (dark/light)
- `theme:changed` (event) - Broadcast theme changes to renderer

**Design:**
- Handler registration separate from event listener setup
- Listener uses `BrowserWindow.getAllWindows()` to broadcast to all windows
- Called after window creation in main.ts

---

### 6. `electron/chat.ts` (refactored)
OpenAI chat integration with explicit registration.

**Exports:**
- `registerChatHandlers()`

**IPC Channels:**
- `chat:send` - Send messages to OpenAI API

**Improvements:**
- No longer uses side-effect import pattern
- Explicit registration function
- Maintains client caching for performance

---

### 7. `electron/main.ts` (simplified)
Now focuses only on window management and initialization.

**Key Functions:**
- `createWindow()` - Window creation with native styling
- `registerAllHandlers()` - Registers all IPC handlers in correct order
- App lifecycle management

**Initialization Flow:**
```typescript
app.whenReady().then(() => {
  // 1. Register all IPC handlers
  registerAllHandlers();

  // 2. Create window
  createWindow();

  // 3. Set up theme listener (needs window instance)
  setupThemeChangeListener();
});
```

**Benefits:**
- Clear, explicit initialization order
- Easy to add new handler modules
- Window creation separate from handler registration

## Benefits

### 1. Maintainability ✅
- Each domain has its own file
- Easy to find specific handlers
- Changes isolated to relevant modules

### 2. Testability ✅
- Each handler module can be tested independently
- Clear interfaces and exports
- No hidden side effects

### 3. Scalability ✅
- Easy to add new handler modules
- Clear pattern to follow
- No risk of main.ts becoming unwieldy again

### 4. Code Clarity ✅
- Explicit dependencies
- No "magic" side-effect imports
- Registration order is clear and documented

### 5. Type Safety ✅
- All handlers maintain strong typing
- Validation at module boundaries
- TypeScript compilation successful

## Migration Notes

### No Breaking Changes
- All IPC channel names unchanged
- Validation logic identical
- Renderer code requires no changes

### Backward Compatibility
- Existing data format unchanged
- All APIs maintain same signatures
- Legacy "default" project still supported

## Testing Checklist

Before deploying, verify:

- [ ] Projects can be created, updated, deleted
- [ ] Stories can be created, loaded, saved, deleted
- [ ] MetaDocs (outline, brief) save and load correctly
- [ ] Manifest loads and saves
- [ ] API key can be set and retrieved
- [ ] Theme detection works on system theme change
- [ ] Chat integration works with OpenAI
- [ ] Reordering projects and stories works
- [ ] Validation errors are properly handled

## Future Improvements

Now that handlers are modular, we can easily:

1. **Add handler-level logging**
   ```typescript
   // In each handler file
   import { logger } from '../logger';
   logger.info('Project created:', projectId);
   ```

2. **Add handler-level error wrappers**
   ```typescript
   // Wrap each handler with standard error handling
   function safeHandle(channel, handler) { ... }
   ```

3. **Add handler-level rate limiting**
   ```typescript
   // Prevent abuse of expensive operations
   import { rateLimit } from '../rateLimit';
   ```

4. **Split large handlers further**
   - `stories.ts` could be split into `stories-crud.ts` + `stories-metadocs.ts`
   - `metaDocs.ts` could be split by scope (root/project/story)

5. **Add unit tests per handler**
   ```
   electron/handlers/__tests__/
     projects.test.ts
     stories.test.ts
     metaDocs.test.ts
   ```

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| main.ts lines | 265 | 94 | -64% |
| Handler modules | 1 | 6 | +500% |
| Average module size | 265 | 1,316 | Smaller, focused |
| Side-effect imports | 1 | 0 | Eliminated |

## Architecture Pattern

This refactoring establishes a clear pattern for IPC handlers:

```typescript
// handler-template.ts
import { ipcMain } from 'electron';
import { validation, dependencies } from '../...';

/**
 * Registers IPC handlers for [domain]
 */
export function register[Domain]Handlers(): void {
  ipcMain.handle('channel:name', async (_event, ...args) => {
    // Validate inputs
    validateSomething(args);

    // Execute operation
    const result = await doSomething(args);

    // Return result
    return result;
  });
}
```

Future contributors can follow this pattern when adding new features.
