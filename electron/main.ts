// electron/main.ts
import { app, BrowserWindow, nativeTheme, Menu, MenuItemConstructorOptions, screen } from 'electron';
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
import { registerExportHandlers } from './handlers/export';
import { openProjectBundle, syncRegistryWithDistilFolder } from './handlers/bundles';

import { createAppMenu, registerMenuHandlers } from './appMenu';

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
  // Good default UX while you're still in a small beta group
  autoUpdater.autoDownload = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("[updates] checking for updates...");
    console.log("[updates] current version:", app.getVersion());
  });

  autoUpdater.on("update-available", (info) => {
    console.log("[updates] update available");
    console.log("[updates] available version:", info.version);
    console.log("[updates] release date:", info.releaseDate);
    console.log("[updates] update info:", JSON.stringify(info, null, 2));
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("[updates] no update available");
    console.log("[updates] current version is latest:", info.version);
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log("[updates] download progress:", Math.round(progress.percent) + "%");
    console.log("[updates] downloaded:", progress.transferred, "of", progress.total, "bytes");
    console.log("[updates] speed:", Math.round(progress.bytesPerSecond / 1024), "KB/s");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[updates] downloaded", info.version, info.releaseDate);
    console.log("[updates] files", info.files);
    console.log("[updates] will install on quit (via autoInstallOnAppQuit)");
  });

  autoUpdater.on("error", (err) => {
    console.error("[updates] error occurred:");
    console.error("[updates] error message:", err.message);
    console.error("[updates] error stack:", err.stack);
    console.error("[updates] full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  });
}

function createWindow() {
  // Get primary display dimensions and calculate appropriate window size
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

  // Desired window size
  const desiredWidth = 1600;
  const desiredHeight = 1000;

  // Leave margin so window isn't exactly screen-sized
  const margin = 100;
  const maxWidth = screenWidth - margin;
  const maxHeight = screenHeight - margin;

  // Calculate actual window dimensions constrained to available space
  const actualWidth = Math.min(desiredWidth, maxWidth);
  const actualHeight = Math.min(desiredHeight, maxHeight);

  win = new BrowserWindow({
    width: actualWidth,
    height: actualHeight,
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

  win.webContents.on('context-menu', (_event, params) => {
    const contextMenuTemplate: MenuItemConstructorOptions[] = [];

    // Spellcheck suggestions (only when right-clicking a misspelled word)
    if (params.misspelledWord) {
      if (params.dictionarySuggestions?.length) {
        for (const suggestion of params.dictionarySuggestions.slice(0, 6)) {
          contextMenuTemplate.push({
            label: suggestion,
            click: () => win?.webContents.replaceMisspelling(suggestion),
          })
        }
      } else {
        contextMenuTemplate.push({
          label: 'No suggestions',
        })
      }
      contextMenuTemplate.push({ type: 'separator' })
    }

    contextMenuTemplate.push({ role: 'editMenu' });
    const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);

    // Whether the context is editable.
    if (params.isEditable) {
      contextMenu.popup({
        frame: params.frame ?? undefined
      })
    }
  })

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
  registerExportHandlers();
  registerMenuHandlers();
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle opening .distilproject files
app.on('open-file', async (event, filePath) => {
  event.preventDefault();

  if (filePath.endsWith('.distilproject')) {
    console.log('[bundles] Opening project bundle:', filePath);
    try {
      const projectId = await openProjectBundle(filePath);

      // Navigate to project in UI
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send('navigation:openProject', projectId);
      }

      console.log('[bundles] Opened project:', projectId);

      // Add to macOS Recent Documents
      app.addRecentDocument(filePath);
    } catch (err) {
      console.error('[bundles] Error opening bundle:', err);
    }
  }
});

// Configure About Panel
app.setAboutPanelOptions({
  applicationName: 'Distil',
  applicationVersion: app.getVersion(),
  version: app.getVersion(),
  copyright: '© 2025 Martin Lissmyr',
  credits: 'A local-first writing tool built on the Layered Contextual Relevance Framework',
  iconPath: path.join(__dirname, '../build/icon.png')
});

app.whenReady().then(() => {
  setupAutoUpdates();

  // Create initial menu
  const menu = createAppMenu({ isStoryContext: false });
  Menu.setApplicationMenu(menu);

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

  // Sync registry with bundles in ~/Distil/ (background, non-blocking)
  syncRegistryWithDistilFolder().catch(err => {
    console.error('[bundles] Startup sync failed:', err);
  });
});