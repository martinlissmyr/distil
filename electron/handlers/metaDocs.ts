// electron/handlers/metaDocs.ts
import type { JSONContent } from '@tiptap/react';
import {
  loadStoryMetaDoc,
  saveStoryMetaDoc,
  loadRootMetaDoc,
  saveRootMetaDoc,
} from '../fs/alineaFs';
import {
  validateProjectId,
  validateStoryId,
  validateMetaDocKey,
  validateJsonDoc,
} from '../validation';
import { safeHandle } from '../utils/ipcHandler';

/**
 * Registers IPC handlers for metaDocs operations
 * MetaDocs are flexible JSON documents scoped to root/project/story levels
 */
export function registerMetaDocHandlers(): void {
  // ---- Story-level metaDocs ----
  safeHandle(
    'storyMeta:load',
    async (projectId: string, storyId: string, key: string) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateMetaDocKey(key);
      return loadStoryMetaDoc(projectId, storyId, key);
    }
  );

  safeHandle(
    'storyMeta:save',
    async (projectId: string, storyId: string, key: string, doc: JSONContent) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateMetaDocKey(key);
      validateJsonDoc(doc);
      await saveStoryMetaDoc(projectId, storyId, key, doc);
      return undefined; // void return
    }
  );

  // ---- Root-level metaDocs ----
  safeHandle('rootMeta:load', async (key: string) => {
    validateMetaDocKey(key);
    return loadRootMetaDoc(key);
  });

  safeHandle('rootMeta:save', async (key: string, doc: JSONContent) => {
    validateMetaDocKey(key);
    validateJsonDoc(doc);
    await saveRootMetaDoc(key, doc);
    return undefined; // void return
  });
}
