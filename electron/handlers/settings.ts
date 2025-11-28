// electron/handlers/settings.ts
import { ipcMain } from 'electron';
import { saveApiKey, loadApiKey, clearApiKey } from '../secureStore';
import { validateApiKey } from '../validation';

/**
 * Registers IPC handlers for application settings (API keys, preferences, etc.)
 */
export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:setApiKey', async (_event, key: string) => {
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
}
