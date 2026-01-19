import { app, Menu, MenuItemConstructorOptions } from 'electron';

const isMac = process.platform === 'darwin';
const isDevMode = !!process.env['VITE_DEV_SERVER_URL'];

export const appMenu = Menu.buildFromTemplate([
  ...(isMac
    ? [{
        label: app.name,
        submenu: [
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ]
      }] as MenuItemConstructorOptions[]
    : []),
  { role: 'editMenu' as const },
  ...(isDevMode
    ? [{
        label: 'Developer',
        submenu: [
          { role: 'toggleDevTools' as const },
        ]
      }] as MenuItemConstructorOptions[]
    : []),
]);
