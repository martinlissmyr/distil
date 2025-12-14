// electron/handlers/stories.ts
import {
  listStories,
  createStory,
  loadStory,
  saveStory,
  updateStory,
  deleteStory,
  reorderStories,
} from '../fs/fs';
import {
  validateProjectId,
  validateStoryId,
  validateName,
  validateIdArray,
} from '../validation';
import { safeHandle } from '../utils/ipcHandler';

/**
 * Registers IPC handlers for story CRUD operations
 */
export function registerStoryHandlers(): void {
  safeHandle('stories:list', async (projectId: string) => {
    validateProjectId(projectId);
    return listStories(projectId);
  });

  safeHandle('story:create', async (projectId: string, title: string) => {
    validateProjectId(projectId);
    validateName(title);
    return createStory(projectId, title);
  });

  safeHandle('story:load', async (projectId: string, storyId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    return loadStory(projectId, storyId);
  });

  safeHandle('story:save', async (projectId: string, storyId: string, payload) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    // payload validation happens implicitly through TypeScript types
    await saveStory(projectId, storyId, payload);
    return undefined; // void return
  });

  safeHandle('stories:reorder', async (projectId: string, ids: string[]) => {
    validateProjectId(projectId);
    validateIdArray(ids);
    ids.forEach(validateStoryId);
    await reorderStories(projectId, ids);
    return undefined; // void return
  });

  safeHandle(
    'story:update',
    async (projectId: string, storyId: string, updates: { title?: string }) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      if (updates.title !== undefined) {
        validateName(updates.title);
      }
      return updateStory(projectId, storyId, updates);
    }
  );

  safeHandle('story:delete', async (projectId: string, storyId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    await deleteStory(projectId, storyId);
    return undefined; // void return
  });
}
