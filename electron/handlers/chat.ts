// electron/handlers/chat.ts
import { loadChatThread, saveChatThread } from '../fs/fs';
import type { ChatThread } from '../fs/fs';
import { safeHandle } from '../utils/ipcHandler';

/**
 * Registers IPC handlers for chat thread persistence
 */
export function registerChatThreadHandlers(): void {
  safeHandle('chat:load', async (threadId: string) => {
    if (!threadId || typeof threadId !== 'string') {
      throw new Error('Invalid threadId');
    }
    return loadChatThread(threadId);
  });

  safeHandle('chat:save', async (thread: ChatThread) => {
    if (!thread || !thread.threadId || !Array.isArray(thread.messages)) {
      throw new Error('Invalid chat thread data');
    }
    await saveChatThread(thread);
    return undefined; // void return
  });
}
