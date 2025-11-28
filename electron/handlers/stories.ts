// electron/handlers/stories.ts
import { ipcMain } from 'electron';
import {
  listStories,
  createStory,
  loadStory,
  saveStory,
  updateStory,
  deleteStory,
  reorderStories,
} from '../fs/alineaFs';
import {
  validateProjectId,
  validateStoryId,
  validateName,
  validateIdArray,
} from '../validation';

/**
 * Registers IPC handlers for story CRUD operations
 */
export function registerStoryHandlers(): void {
  ipcMain.handle('stories:list', async (_event, projectId: string) => {
    validateProjectId(projectId);
    return listStories(projectId);
  });

  ipcMain.handle(
    'story:create',
    async (_event, projectId: string, title: string) => {
      validateProjectId(projectId);
      validateName(title);
      return createStory(projectId, title);
    }
  );

  ipcMain.handle(
    'story:load',
    async (_event, projectId: string, storyId: string) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      return loadStory(projectId, storyId);
    }
  );

  ipcMain.handle(
    'story:save',
    async (_event, projectId: string, storyId: string, payload) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      // payload validation happens implicitly through TypeScript types
      await saveStory(projectId, storyId, payload);
      return { ok: true };
    }
  );

  ipcMain.handle(
    'stories:reorder',
    async (_event, projectId: string, ids: string[]) => {
      validateProjectId(projectId);
      validateIdArray(ids);
      ids.forEach(validateStoryId);
      await reorderStories(projectId, ids);
      return { ok: true };
    }
  );

  ipcMain.handle(
    'story:update',
    async (
      _event,
      projectId: string,
      storyId: string,
      updates: { title?: string }
    ) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      if (updates.title !== undefined) {
        validateName(updates.title);
      }
      return updateStory(projectId, storyId, updates);
    }
  );

  ipcMain.handle(
    'story:delete',
    async (_event, projectId: string, storyId: string) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      await deleteStory(projectId, storyId);
      return { ok: true };
    }
  );
}
