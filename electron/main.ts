import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'fs/promises';
import './chat';
import { saveApiKey, loadApiKey, clearApiKey } from './secureStore';

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
} from './fs/alineaFs';

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

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

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()        // 👈 add here
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    win.webContents.openDevTools()        // keep this if you want devtools in prod too, or remove
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
});

ipcMain.handle('settings:setApiKey', async (_e, key) => {
  await saveApiKey(key);
});

ipcMain.handle('settings:getApiKey', async () => {
  return loadApiKey();
});

ipcMain.handle('settings:clearApiKey', async () => {
  await clearApiKey();
  return { ok: true };
});

ipcMain.handle('projects:list', async () => {
  return listProjects();
});

ipcMain.handle('projects:create', async (_event, name: string) => {
  return createProject(name);
});

ipcMain.handle(
  'projects:update',
  async (_event, projectId: string, updates: { name?: string }) => {
    return updateProject(projectId, updates);
  }
);

ipcMain.handle('projects:delete', async (_event, projectId: string) => {
  await deleteProject(projectId);
  return { ok: true };
});

ipcMain.handle('projects:reorder', async (_event, ids: string[]) => {
  await reorderProjects(ids);
  return { ok: true };
});

// Stories
ipcMain.handle('stories:list', async (_event, projectId: string) => {
  return listStories(projectId);
});

ipcMain.handle(
  'story:create',
  async (_event, projectId: string, title: string) => {
    return createStory(projectId, title);
  }
);

ipcMain.handle(
  'story:load',
  async (_event, projectId: string, storyId: string) => {
    return loadStory(projectId, storyId);
  }
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
  async (_event, projectId: string, storyId: string, updates: { title?: string }) => {
    return updateStory(projectId, storyId, updates);
  }
);

ipcMain.handle(
  'story:delete',
  async (_event, projectId: string, storyId: string) => {
    await deleteStory(projectId, storyId);
    return { ok: true };
  }
);

ipcMain.handle('alinea:loadManifest', async () => {
  return loadManifest();
});

ipcMain.handle('alinea:saveManifest', async (_event, payload: ManifestData) => {
  await saveManifest(payload);
  return { ok: true };
});

ipcMain.handle('theme:get', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

nativeTheme.on('updated', () => {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  win?.webContents.send('theme:changed', theme);
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
})

app.whenReady().then(createWindow);

