// electron/chat.ts
import OpenAI from 'openai';
import { loadApiKey } from './secureStore';
import { safeHandle } from './utils/ipcHandler';

// Optionally cache the client between calls
let cachedClient: OpenAI | null = null;
let cachedKey: string | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await loadApiKey();

  if (!apiKey) {
    throw new Error(
      'No OpenAI API key configured. Please add one in settings first.'
    );
  }

  // Reuse client if key hasn't changed
  if (cachedClient && cachedKey === apiKey) {
    return cachedClient;
  }

  const client = new OpenAI({ apiKey });
  cachedClient = client;
  cachedKey = apiKey;
  return client;
}

/**
 * Payload for chat:send IPC call
 */
export type ChatPayload = {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
};

/**
 * Registers IPC handlers for OpenAI chat integration
 */
export function registerChatHandlers(): void {
  safeHandle('chat:send', async (payload: ChatPayload) => {
    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload: must be an object');
    }
    if (!Array.isArray(payload.messages)) {
      throw new Error('Invalid payload: messages must be an array');
    }
    if (payload.messages.length === 0) {
      throw new Error('Invalid payload: messages array cannot be empty');
    }

    // Validate each message
    for (const msg of payload.messages) {
      if (!msg || typeof msg !== 'object') {
        throw new Error('Invalid message: must be an object');
      }
      if (typeof msg.role !== 'string' || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error('Invalid message: role must be user, assistant, or system');
      }
      if (typeof msg.content !== 'string') {
        throw new Error('Invalid message: content must be a string');
      }
      // Reasonable content length limit (100k characters ~ 25k tokens)
      if (msg.content.length > 100000) {
        throw new Error('Invalid message: content too long (max 100k characters)');
      }
    }

    // Validate optional parameters
    if (payload.model !== undefined && typeof payload.model !== 'string') {
      throw new Error('Invalid model: must be a string');
    }
    if (payload.temperature !== undefined && typeof payload.temperature !== 'number') {
      throw new Error('Invalid temperature: must be a number');
    }
    if (payload.maxTokens !== undefined && typeof payload.maxTokens !== 'number') {
      throw new Error('Invalid maxTokens: must be a number');
    }
    if (payload.responseFormat !== undefined && !['json', 'text'].includes(payload.responseFormat)) {
      throw new Error('Invalid responseFormat: must be "json" or "text"');
    }

    const openai = await getOpenAIClient();

    // Build completion options
    const completionOptions: OpenAI.Chat.ChatCompletionCreateParams = {
      model: payload.model ?? 'gpt-4o-mini',
      messages: payload.messages,
      temperature: payload.temperature ?? 0.7,
      ...(payload.maxTokens && { max_tokens: payload.maxTokens }),
      ...(payload.responseFormat === 'json' && {
        response_format: { type: 'json_object' },
      }),
    };

    const completion = await openai.chat.completions.create(completionOptions);

    return {
      output_text: completion.choices[0]?.message?.content ?? '',
      raw: completion,
    };
  });
}