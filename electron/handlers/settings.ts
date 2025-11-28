// electron/handlers/settings.ts
import { saveApiKey, loadApiKey, clearApiKey } from '../secureStore';
import { validateApiKey } from '../validation';
import { safeHandle } from '../utils/ipcHandler';

/**
 * Registers IPC handlers for application settings (API keys, preferences, etc.)
 */
export function registerSettingsHandlers(): void {
  safeHandle('settings:setApiKey', async (key: string) => {
    validateApiKey(key);
    await saveApiKey(key);
    return undefined; // void return
  });

  safeHandle('settings:getApiKey', async () => {
    return loadApiKey();
  });

  safeHandle('settings:clearApiKey', async () => {
    await clearApiKey();
    return undefined; // void return
  });
}
