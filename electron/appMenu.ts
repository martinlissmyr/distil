import { app, Menu } from 'electron';

const isMac = process.platform === 'darwin';
const isDevMode = !!process.env['VITE_DEV_SERVER_URL'];

export const appMenu = Menu.buildFromTemplate([
  ...(isMac
    ? [{
        label: app.name,
        submenu: [
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }]
    : []),
  { role: 'editMenu' },
  ...(isDevMode
    ? [{
        label: 'Developer',
        submenu: [
          { role: 'toggleDevTools' },
        ]
      }]
    : []),
]);
