// electron/chat.ts
import { ipcMain } from 'electron';
import OpenAI from 'openai';
import { loadApiKey } from './secureStore';

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

  // Reuse client if key hasn’t changed
  if (cachedClient && cachedKey === apiKey) {
    return cachedClient;
  }

  const client = new OpenAI({ apiKey });
  cachedClient = client;
  cachedKey = apiKey;
  return client;
}

ipcMain.handle('chat:send', async (_event, payload) => {
  // payload = { messages: [{ role, content }, ...] }
  try {
    const openai = await getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: payload.messages,
      temperature: 0.7,
    });

    return {
      ok: true,
      output_text: completion.choices[0]?.message?.content ?? '',
      raw: completion,
    };
  } catch (err: any) {
    console.error('OpenAI error', err);
    return {
      ok: false,
      error:
        err?.message ??
        'Unknown error while talking to OpenAI. Check your API key and connection.',
    };
  }
});