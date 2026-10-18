// electron/appMenu.ts
import { app, Menu, MenuItemConstructorOptions, ipcMain, BrowserWindow } from 'electron';
import type { ExportRequest } from '../src/models/export';

const isMac = process.platform === 'darwin';
const isDevMode = !!process.env['VITE_DEV_SERVER_URL'];

export interface MenuContext {
  isStoryContext: boolean;
  isProjectContext: boolean;
  projectId?: string;
  storyId?: string;
}

function sendExport(request: ExportRequest, browserWindow?: Electron.BaseWindow): void {
  const window = browserWindow instanceof BrowserWindow
    ? browserWindow
    : BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  window?.webContents.send('menu:export', request);
}

function exportMenu(scope: ExportRequest['scope']): MenuItemConstructorOptions {
  return {
    label: scope === 'project' ? 'Export project' : 'Export story',
    submenu: [
      {
        label: 'Export as DOCX...',
        accelerator: 'CmdOrCtrl+Shift+E',
        click: (_item, browserWindow) => sendExport({ scope, format: 'docx' }, browserWindow),
      },
      {
        label: 'Export as PDF...',
        accelerator: 'CmdOrCtrl+Shift+P',
        click: (_item, browserWindow) => sendExport({ scope, format: 'pdf' }, browserWindow),
      },
    ],
  };
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
        { role: 'about' as const },
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
      ...(context.isStoryContext ? [exportMenu('story')] : []),
      ...(context.isProjectContext ? [exportMenu('project')] : []),
      ...((context.isStoryContext || context.isProjectContext) && !isMac
        ? [{ type: 'separator' as const }]
        : []),
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
