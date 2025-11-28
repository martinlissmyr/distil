// electron/handlers/theme.ts
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';

/**
 * Registers IPC handlers for system theme detection and changes
 */
export function registerThemeHandlers(): void {
  ipcMain.handle('theme:get', () =>
    nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  );

  // Note: Theme change listener is set up separately in main.ts
  // because it needs access to the window instance
}

/**
 * Sets up theme change listener that broadcasts to all windows
 * Call this after window creation
 */
export function setupThemeChangeListener(): void {
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    // Send to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('theme:changed', theme);
    });
  });
}
