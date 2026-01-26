// electron/appMenu.ts
import { app, Menu, MenuItemConstructorOptions, ipcMain, BrowserWindow } from 'electron';

const isMac = process.platform === 'darwin';
const isDevMode = !!process.env['VITE_DEV_SERVER_URL'];

export interface MenuContext {
  isStoryContext: boolean;
  projectId?: string;
  storyId?: string;
}

/**
 * Create the application menu based on current context
 */
export function createAppMenu(context: MenuContext) {
  const template: MenuItemConstructorOptions[] = [];

  // macOS app menu
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    });
  }

  // File menu with export options
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'Export story',
        submenu: [
          {
            label: 'Export as DOCX...',
            enabled: context.isStoryContext,
            accelerator: 'CmdOrCtrl+Shift+E',
            click: () => {
              // Send message to renderer to trigger export
              const windows = BrowserWindow.getAllWindows();
              if (windows.length > 0) {
                windows[0].webContents.send('menu:export', 'docx');
              }
            },
          },
          {
            label: 'Export as PDF...',
            enabled: context.isStoryContext,
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => {
              // Send message to renderer to trigger export
              const windows = BrowserWindow.getAllWindows();
              if (windows.length > 0) {
                windows[0].webContents.send('menu:export', 'pdf');
              }
            },
          },
        ],
      },
      { type: 'separator' as const },
      ...(isMac ? [] : [{ role: 'quit' as const }]),
    ] as MenuItemConstructorOptions[],
  });

  // Edit menu
  template.push({ role: 'editMenu' as const });

  // Developer menu (dev mode only)
  if (isDevMode) {
    template.push({
      label: 'Developer',
      submenu: [{ role: 'toggleDevTools' as const }],
    });
  }

  return Menu.buildFromTemplate(template);
}

/**
 * Update the menu based on new context
 */
export function updateMenuContext(context: MenuContext) {
  const menu = createAppMenu(context);
  Menu.setApplicationMenu(menu);
}

/**
 * Register IPC handler for menu context updates from renderer
 */
export function registerMenuHandlers() {
  ipcMain.on('menu:updateContext', (_event, context: MenuContext) => {
    updateMenuContext(context);
  });
}
