// electron/handlers/devMode.ts
import { safeHandle } from '../utils/ipcHandler';
import { VITE_DEV_SERVER_URL } from '../main';

/**
 * Registers IPC handlers for dev mode detection
 */
export function registerDevModeHandlers(): void {
  safeHandle('devMode:isDevMode', async () => {
    return !!VITE_DEV_SERVER_URL;
  });
}
