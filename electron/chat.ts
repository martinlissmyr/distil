// electron/chat.ts
import { ipcMain } from 'electron';
import OpenAI from 'openai';

ipcMain.handle('chat:send', async (_event, payload) => {
  // payload = { messages: [{ role, content }, ...] }
  try {
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
      error: err?.message ?? 'Unknown error',
    };
  }
});