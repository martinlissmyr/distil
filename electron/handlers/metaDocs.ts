// electron/handlers/metaDocs.ts
import { ipcMain } from 'electron';
import type { JSONContent } from '@tiptap/react';
import {
  loadManifest,
  saveManifest,
  loadStoryMetaDoc,
  saveStoryMetaDoc,
  loadRootMetaDoc,
  saveRootMetaDoc,
  type ManifestData,
} from '../fs/alineaFs';
import {
  validateProjectId,
  validateStoryId,
  validateMetaDocKey,
  validateJsonDoc,
} from '../validation';

/**
 * Registers IPC handlers for metaDocs and manifest operations
 * MetaDocs are flexible JSON documents scoped to root/project/story levels
 */
export function registerMetaDocHandlers(): void {
  // ---- Manifest (legacy direct API) ----
  ipcMain.handle('alinea:loadManifest', async () => loadManifest());

  ipcMain.handle(
    'alinea:saveManifest',
    async (_event, payload: ManifestData) => {
      validateJsonDoc(payload);
      await saveManifest(payload);
      return { ok: true };
    }
  );

  // ---- Story-level metaDocs ----
  ipcMain.handle(
    'storyMeta:load',
    async (_event, projectId: string, storyId: string, key: string) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateMetaDocKey(key);
      return loadStoryMetaDoc(projectId, storyId, key);
    }
  );

  ipcMain.handle(
    'storyMeta:save',
    async (
      _event,
      projectId: string,
      storyId: string,
      key: string,
      doc: JSONContent
    ) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateMetaDocKey(key);
      validateJsonDoc(doc);
      await saveStoryMetaDoc(projectId, storyId, key, doc);
      return { ok: true };
    }
  );

  // ---- Root-level metaDocs ----
  ipcMain.handle('rootMeta:load', async (_event, key: string) => {
    validateMetaDocKey(key);
    return loadRootMetaDoc(key);
  });

  ipcMain.handle(
    'rootMeta:save',
    async (_event, key: string, doc: JSONContent) => {
      validateMetaDocKey(key);
      validateJsonDoc(doc);
      await saveRootMetaDoc(key, doc);
      return { ok: true };
    }
  );
}
