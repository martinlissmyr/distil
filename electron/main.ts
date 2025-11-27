// electron/main.ts
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import './chat';
import { saveApiKey, loadApiKey, clearApiKey } from './secureStore';
import type { JSONContent } from '@tiptap/react';

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

const require = createRequire(import.meta.url);
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
    // keep or remove depending on whether you want devtools in prod
    win.webContents.openDevTools();
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

ipcMain.handle('projects:create', async (_event, name: string) =>
  createProject(name)
);

ipcMain.handle(
  'projects:update',
  async (_event, projectId: string, updates: { name?: string }) =>
    updateProject(projectId, updates)
);

ipcMain.handle('projects:delete', async (_event, projectId: string) => {
  await deleteProject(projectId);
  return { ok: true };
});

ipcMain.handle('projects:reorder', async (_event, ids: string[]) => {
  await reorderProjects(ids);
  return { ok: true };
});

// ---- Stories ----
ipcMain.handle('stories:list', async (_event, projectId: string) =>
  listStories(projectId)
);

ipcMain.handle(
  'story:create',
  async (_event, projectId: string, title: string) =>
    createStory(projectId, title)
);

ipcMain.handle(
  'story:load',
  async (_event, projectId: string, storyId: string) =>
    loadStory(projectId, storyId)
);

ipcMain.handle(
  'story:save',
  async (_event, projectId: string, storyId: string, payload) => {
    await saveStory(projectId, storyId, payload);
    return { ok: true };
  }
);

ipcMain.handle(
  'stories:reorder',
  async (_event, projectId: string, ids: string[]) => {
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
  ) => updateStory(projectId, storyId, updates)
);

ipcMain.handle(
  'story:delete',
  async (_event, projectId: string, storyId: string) => {
    await deleteStory(projectId, storyId);
    return { ok: true };
  }
);

// ---- Manifest ----
ipcMain.handle('alinea:loadManifest', async () => loadManifest());

ipcMain.handle(
  'alinea:saveManifest',
  async (_event, payload: ManifestData) => {
    await saveManifest(payload);
    return { ok: true };
  }
);

// ---- Story metaDocs ----
ipcMain.handle(
  'storyMeta:load',
  async (_event, projectId: string, storyId: string, key: string) =>
    loadStoryMetaDoc(projectId, storyId, key)
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
    await saveStoryMetaDoc(projectId, storyId, key, doc);
    return { ok: true };
  }
);

ipcMain.handle(
  'rootMeta:load',
  async (_event, key: string) => {
    return loadRootMetaDoc(key);
  }
);

ipcMain.handle(
  'rootMeta:save',
  async (_event, key: string, doc: JSONContent) => {
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