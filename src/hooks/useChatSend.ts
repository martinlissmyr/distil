// src/hooks/useChatSend.ts
import { useState, useCallback } from 'react';
import { buildPrompt } from '../chat/buildChatPrompt';
import type { EditorKind, QuestionScope } from '../types/chat';
import type { ChatMessage } from './useChatMessages';
import { useAppStore } from '../state/useAppStore';

const MAX_TURNS = 4;

interface UseChatSendOptions {
  kind: EditorKind;
  title: string;
  scope: QuestionScope;
  fullTextMarkdown: string;
  selectionMarkdown: string;
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  projectId?: string;
  storyId?: string;
}

interface UseChatSendResult {
  isSending: boolean;
  handleSend: (promptOverride?: string, displayMessage?: string) => Promise<void>;
}

/**
 * Hook for handling chat API calls and message sending logic
 */
export function useChatSend({
  kind,
  title,
  scope,
  fullTextMarkdown,
  selectionMarkdown,
  messages,
  addMessage,
  projectId,
  storyId,
}: UseChatSendOptions): UseChatSendResult {
  const [isSending, setIsSending] = useState(false);

  // ✅ Read writing language from app store (single in-app source of truth)
  const writingLanguage = useAppStore((s) => s.writingLanguage);

  const handleSend = useCallback(
    async (promptOverride?: string, displayMessage?: string) => {
      const rawInput = promptOverride ?? '';
      const rawUserPrompt = rawInput.trim();
      if (!rawUserPrompt || isSending) return;

      // Add user message (use displayMessage for UI, rawUserPrompt for API)
      const userMessage: ChatMessage = {
        id: `m-${Date.now()}-user`,
        role: 'user',
        content: displayMessage?.trim() || rawUserPrompt,
        actualPrompt: displayMessage ? rawUserPrompt : undefined, // preserve detailed prompt
      };

      addMessage(userMessage);
      setIsSending(true);

      try {
        // Build message history (last MAX_TURNS turns, excluding ephemeral messages)
        const history = messages
          .concat(userMessage)
          .filter((m) => !m.ephemeral)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.actualPrompt ?? m.content, // use actualPrompt if available
          }));

        const turns = history.slice(-MAX_TURNS);

        // Build prompt with context + configured writing language
        const prompt = await buildPrompt({
          rawUserPrompt,
          kind,
          title,
          scope,
          fullTextMarkdown,
          selectionMarkdown,
          projectId,
          storyId,
          language: writingLanguage,
        });

        // Construct API payload
        const payload = {
          messages: [
            { role: 'system' as const, content: prompt.system },
            { role: 'assistant' as const, content: prompt.assistant },
            ...turns,
            { role: 'user' as const, content: prompt.user },
          ],
        };

        // Call chat API
        const response = await window.chat.send(payload);

        if (!response.ok) {
          const rawError: string = response.error;
          let friendly = 'Something went wrong talking to the model.';

          if (rawError.includes('No OpenAI API key configured')) {
            friendly =
              'No OpenAI API key is configured. Add one under Settings → API key to use the assistant.';
          }

          addMessage({
            id: `m-${Date.now()}-assistant-error`,
            role: 'assistant',
            content: friendly,
            ephemeral: true,
          });
          return;
        }

        addMessage({
          id: `m-${Date.now()}-assistant`,
          role: 'assistant',
          content:
            response.data.output_text || 'Sorry, I could not generate a response.',
        });
      } catch (err) {
        console.error('Chat error', err);
        addMessage({
          id: `m-${Date.now()}-error`,
          role: 'assistant',
          content: 'Something went wrong talking to the model.',
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      messages,
      addMessage,
      kind,
      title,
      scope,
      fullTextMarkdown,
      selectionMarkdown,
      projectId,
      storyId,
      writingLanguage,
    ]
  );

  return {
    isSending,
    handleSend,
  };
}