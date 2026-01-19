// electron/main.ts
import { app, BrowserWindow, nativeTheme, Menu } from 'electron';
import { autoUpdater } from "electron-updater";
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Handler registration functions
import { registerSettingsHandlers } from './handlers/settings';
import { registerProjectHandlers } from './handlers/projects';
import { registerStoryHandlers } from './handlers/stories';
import { registerMetaDocHandlers } from './handlers/metaDocs';
import { registerEntityHandlers } from './handlers/entities';
import { registerThemeHandlers, setupThemeChangeListener } from './handlers/theme';
import { registerChatHandlers } from './chat';
import { registerChatThreadHandlers } from './handlers/chat';
import { registerDevModeHandlers } from './handlers/devMode';

import { appMenu } from './appMenu';

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

function setupAutoUpdates() {
  // Good default UX while you’re still in a small beta group
  autoUpdater.autoDownload = true;

  // Optional: log
  autoUpdater.on("checking-for-update", () => console.log("[updates] checking"));
  autoUpdater.on("update-available", () => console.log("[updates] available"));
  autoUpdater.on("update-not-available", () => console.log("[updates] none"));
  autoUpdater.on("error", (err) => console.log("[updates] error", err));
  autoUpdater.on("update-downloaded", () => console.log("[updates] downloaded"));
}

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
    icon: path.join(__dirname, 'assets/icons/png/64x64.png'),
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

// Register all IPC handlers
function registerAllHandlers(): void {
  registerSettingsHandlers();
  registerProjectHandlers();
  registerStoryHandlers();
  registerMetaDocHandlers();
  registerEntityHandlers();
  registerThemeHandlers();
  registerChatHandlers();
  registerChatThreadHandlers();
  registerDevModeHandlers();
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(() => {
  setupAutoUpdates();

  Menu.setApplicationMenu(appMenu);

  if (app.isPackaged) {
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify();
  } else {
    console.log("[updates] skipping (dev mode)");
  }

  // Register all IPC handlers before creating window
  registerAllHandlers();

  // Create window
  createWindow();

  // Set up theme change listener after window is created
  setupThemeChangeListener();
});