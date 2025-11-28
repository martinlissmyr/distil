// electron/main.ts
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import './chat';
import { saveApiKey, loadApiKey, clearApiKey } from './secureStore';
import type { JSONContent } from '@tiptap/react';
import {
  validateProjectId,
  validateStoryId,
  validateName,
  validateMetaDocKey,
  validateIdArray,
  validateApiKey,
  validateJsonDoc,
} from './validation';

import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
  listStories,
  createStory,
  loadStory,
  saveStory,
  reorderStories,
  updateStory,
  deleteStory,
  loadManifest,
  saveManifest,
  loadStoryMetaDoc,
  saveStoryMetaDoc,
  loadRootMetaDoc,
  saveRootMetaDoc,
  type ManifestData,
} from './fs/alineaFs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
      height: 44,
    },
    backgroundColor: '#00000000',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  win.setTitle('');

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send(
      'main-process-message',
      new Date().toLocaleString()
    );
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

// ---- Settings (API key) ----
ipcMain.handle('settings:setApiKey', async (_e, key: string) => {
  validateApiKey(key);
  await saveApiKey(key);
});

ipcMain.handle('settings:getApiKey', async () => {
  return loadApiKey();
});

ipcMain.handle('settings:clearApiKey', async () => {
  await clearApiKey();
  return { ok: true };
});

// ---- Projects ----
ipcMain.handle('projects:list', async () => listProjects());

ipcMain.handle('projects:create', async (_event, name: string) => {
  validateName(name);
  return createProject(name);
});

ipcMain.handle(
  'projects:update',
  async (_event, projectId: string, updates: { name?: string }) => {
    validateProjectId(projectId);
    if (updates.name !== undefined) {
      validateName(updates.name);
    }
    return updateProject(projectId, updates);
  }
);

ipcMain.handle('projects:delete', async (_event, projectId: string) => {
  validateProjectId(projectId);
  await deleteProject(projectId);
  return { ok: true };
});

ipcMain.handle('projects:reorder', async (_event, ids: string[]) => {
  validateIdArray(ids);
  ids.forEach(validateProjectId);
  await reorderProjects(ids);
  return { ok: true };
});

// ---- Stories ----
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

// ---- Manifest ----
ipcMain.handle('alinea:loadManifest', async () => loadManifest());

ipcMain.handle(
  'alinea:saveManifest',
  async (_event, payload: ManifestData) => {
    validateJsonDoc(payload);
    await saveManifest(payload);
    return { ok: true };
  }
);

// ---- Story metaDocs ----
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

ipcMain.handle(
  'rootMeta:load',
  async (_event, key: string) => {
    validateMetaDocKey(key);
    return loadRootMetaDoc(key);
  }
);

ipcMain.handle(
  'rootMeta:save',
  async (_event, key: string, doc: JSONContent) => {
    validateMetaDocKey(key);
    validateJsonDoc(doc);
    await saveRootMetaDoc(key, doc);
    return { ok: true };
  }
);

// ---- Theme ----
ipcMain.handle('theme:get', () =>
  nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
);

nativeTheme.on('updated', () => {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  win?.webContents.send('theme:changed', theme);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);