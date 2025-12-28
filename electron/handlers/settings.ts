// electron/handlers/settings.ts
import { saveApiKey, loadApiKey, clearApiKey } from '../secureStore';
import { validateApiKey, validateWritingLanguagem, validateUiSchema } from '../validation';
import { safeHandle } from '../utils/ipcHandler';
import { getWritingLanguage, setWritingLanguagem, setUiSchema, getUiSchema } from '../fs/settings';

/**
 * Registers IPC handlers for application settings (API keys, preferences, etc.)
 */
export function registerSettingsHandlers(): void {
  // ---- API key ----
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

  // ---- Writing language ----
  safeHandle('settings:setWritingLanguage', async (lang: string) => {
    validateWritingLanguage(lang);
    await setWritingLanguage(lang);
    return undefined; // void return
  });

  safeHandle('settings:getWritingLanguage', async () => {
    // Default should be "sv" if nothing stored
    const stored = await getWritingLanguage();
    return stored ?? 'sv';
  });

  // ---- Writing language ----
  safeHandle('settings:setUiSchema', async (schema: string) => {
    validateUiSchema(schema);
    await setUiSchema(schema);
    return undefined; // void return
  });

  safeHandle('settings:getUiSchema', async () => {
    // Default should be "system" if nothing stored
    const stored = await getUiSchema();
    return stored ?? 'system';
  });

}