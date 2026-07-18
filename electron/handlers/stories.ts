// electron/handlers/stories.ts
import {
  listStories,
  createStory,
  loadStoryMetadata,
  saveStoryMetadata,
  updateStory,
  deleteStory,
  reorderStories,
  loadPartDoc,
  savePartDoc,
  createPart,
  deletePart,
  reorderParts,
} from '../fs/fs';
import type { StoryMetadata } from '../fs/fs';
import {
  validateProjectId,
  validateStoryId,
  validateName,
  validateIdArray,
  validateJsonDoc,
} from '../validation';
import { safeHandle } from '../utils/ipcHandler';
import type { JSONContent } from '@tiptap/react';

/**
 * Registers IPC handlers for story CRUD operations (multi-part structure)
 */
export function registerStoryHandlers(): void {
  // Story metadata operations
  safeHandle('stories:list', async (projectId: string) => {
    validateProjectId(projectId);
    return listStories(projectId);
  });

  safeHandle('story:create', async (projectId: string, title: string) => {
    validateProjectId(projectId);
    validateName(title);
    return createStory(projectId, title);
  });

  safeHandle('story:loadMetadata', async (projectId: string, storyId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    return loadStoryMetadata(projectId, storyId);
  });

  safeHandle('story:saveMetadata', async (projectId: string, storyId: string, metadata: StoryMetadata) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    await saveStoryMetadata(projectId, storyId, metadata);
    return undefined; // void return
  });

  safeHandle('story:update', async (projectId: string, storyId: string, updates: { title?: string }) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    if (updates.title !== undefined) {
      validateName(updates.title);
    }
    return updateStory(projectId, storyId, updates);
  });

  safeHandle('story:delete', async (projectId: string, storyId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    await deleteStory(projectId, storyId);
    return undefined; // void return
  });

  safeHandle('stories:reorder', async (projectId: string, ids: string[]) => {
    validateProjectId(projectId);
    validateIdArray(ids);
    ids.forEach(validateStoryId);
    await reorderStories(projectId, ids);
    return undefined; // void return
  });

  // Part operations
  safeHandle('part:load', async (projectId: string, storyId: string, partId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    // partId validation (simple non-empty check)
    if (!partId || typeof partId !== 'string') {
      throw new Error('Invalid partId');
    }
    return loadPartDoc(projectId, storyId, partId);
  });

  safeHandle('part:save', async (projectId: string, storyId: string, partId: string, doc: JSONContent) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    if (!partId || typeof partId !== 'string') {
      throw new Error('Invalid partId');
    }
    validateJsonDoc(doc);
    await savePartDoc(projectId, storyId, partId, doc);
    return undefined; // void return
  });

  safeHandle('part:create', async (projectId: string, storyId: string, order: number) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    if (typeof order !== 'number' || order < 0) {
      throw new Error('Invalid order');
    }
    return createPart(projectId, storyId, order);
  });

  safeHandle('part:delete', async (projectId: string, storyId: string, partId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    if (!partId || typeof partId !== 'string') {
      throw new Error('Invalid partId');
    }
    await deletePart(projectId, storyId, partId);
    return undefined; // void return
  });

  safeHandle('parts:reorder', async (projectId: string, storyId: string, ids: string[]) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    validateIdArray(ids);
    await reorderParts(projectId, storyId, ids);
    return undefined; // void return
  });
}
