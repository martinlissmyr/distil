// src/hooks/useChatSend.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { buildPrompt } from '../chat/buildChatPrompt';
import type { EditorKind, QuestionScope } from '../types/chat';
import type { ChatMessage } from './useChatMessages';
import { useAppStore } from '../state/useAppStore';

const MAX_TURNS = 6;

function toFriendlyModelError(rawError: string): string {
  if (rawError.includes('API key')) {
    return 'No OpenAI API key is configured. Add one under Settings → API key to use the assistant.';
  }

  return 'Something went wrong talking to the model.';
}

interface UseChatSendOptions {
  kind: EditorKind;
  title: string;
  scope: QuestionScope;
  fullTextMarkdown: string;
  selectionMarkdown: string;
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, delta: string) => void;
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
  updateMessage,
  appendToMessage,
  projectId,
  storyId,
}: UseChatSendOptions): UseChatSendResult {
  const [isSending, setIsSending] = useState(false);
  const activeStreamRef = useRef<{ cancel: () => void } | null>(null);
  const frameRef = useRef<number | null>(null);
  const deltaBufferRef = useRef('');

  // ✅ Read writing language from app store (single in-app source of truth)
  const writingLanguage = useAppStore((s) => s.writingLanguage);

  useEffect(() => {
    return () => {
      activeStreamRef.current?.cancel();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

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
        status: 'complete',
      };

      addMessage(userMessage);
      setIsSending(true);

      const assistantMessageId = `m-${Date.now()}-assistant`;
      let fullAssistantText = '';
      let streamCompleted = false;
      let assistantMessageAdded = false;

      const flushDeltas = () => {
        frameRef.current = null;
        const delta = deltaBufferRef.current;
        if (!delta) return;

        deltaBufferRef.current = '';
        appendToMessage(assistantMessageId, delta);
      };

      const queueDelta = (delta: string) => {
        fullAssistantText += delta;
        deltaBufferRef.current += delta;

        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(flushDeltas);
      };

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
          profile: 'chat' as const,
          messages: [
            { role: 'system' as const, content: prompt.system },
            { role: 'assistant' as const, content: prompt.assistant },
            ...turns,
            { role: 'user' as const, content: prompt.user },
          ],
        };

        addMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          status: 'streaming',
        });
        assistantMessageAdded = true;

        await new Promise<void>((resolve) => {
          activeStreamRef.current = window.chat.stream(payload, {
            onDelta: queueDelta,
            onDone: (result) => {
              streamCompleted = true;

              if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
              }

              deltaBufferRef.current = '';
              updateMessage(assistantMessageId, {
                content:
                  result.output_text ||
                  fullAssistantText ||
                  'Sorry, I could not generate a response.',
                status: 'complete',
              });
              activeStreamRef.current = null;
              resolve();
            },
            onError: (rawError) => {
              const friendly = toFriendlyModelError(rawError);

              if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
              }

              deltaBufferRef.current = '';
              updateMessage(assistantMessageId, {
                content: fullAssistantText || friendly,
                status: 'error',
                ephemeral: !fullAssistantText,
              });
              activeStreamRef.current = null;
              resolve();
            },
          });
        });
      } catch (err) {
        console.error('Chat error', err);
        const rawError = err instanceof Error ? err.message : String(err);
        const errorMessage = fullAssistantText || toFriendlyModelError(rawError);

        if (assistantMessageAdded) {
          updateMessage(assistantMessageId, {
            content: errorMessage,
            status: 'error',
            ephemeral: !fullAssistantText,
          });
        } else {
          addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: errorMessage,
            status: 'error',
            ephemeral: true,
          });
        }
      } finally {
        if (!streamCompleted && frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        setIsSending(false);
      }
    },
    [
      isSending,
      messages,
      addMessage,
      updateMessage,
      appendToMessage,
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
