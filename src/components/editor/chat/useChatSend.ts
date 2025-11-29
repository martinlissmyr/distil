// src/components/editor/chat/useChatSend.ts
import { useState, useCallback } from 'react';
import { buildPrompt } from '../../../chat/buildPrompt';
import type { EditorKind, QuestionScope } from '../../../types/chat';
import type { ChatMessage } from './useChatMessages';

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
      };

      addMessage(userMessage);
      setIsSending(true);

      try {
        // Build message history (last 4 turns, excluding ephemeral messages)
        const MAX_TURNS = 4;
        const history = messages
          .concat(userMessage)
          .filter((m) => !m.ephemeral)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        const turns = history.slice(-MAX_TURNS);

        // Get API key for intelligent context selection
        const apiKeyResponse = await window.settings.getApiKey();
        const apiKey = apiKeyResponse.ok ? apiKeyResponse.data : undefined;

        // Build prompt with context (now async)
        const prompt = await buildPrompt({
          rawUserPrompt,
          kind,
          title,
          scope,
          fullTextMarkdown,
          selectionMarkdown,
          projectId,
          storyId,
          useIntelligentContext: true, // Use GPT-4o-mini for ambiguous cases
          apiKey,
          language: 'sv', // TODO: Detect or configure language
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

        // TEMPORARY: Mock response for testing scroll behavior
        const USE_MOCK_RESPONSE = false;

        if (USE_MOCK_RESPONSE) {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          const mockResponse = {
            ok: true as const,
            data: {
              output_text: `Here's a comprehensive response to test the scrolling behavior with a long message that includes various markdown elements.

## Introduction

This is a lengthy response designed to demonstrate how the chat interface handles long content with the typing animation effect. The response should scroll smoothly as it appears.

### Key Points to Consider

1. **First important point**: The scrolling behavior should keep the user's message visible at the top while this response appears below.

2. **Second point**: As the typing animation progresses, the content should grow naturally and the scroll position should remain stable.

3. **Third consideration**: The markdown formatting should render correctly throughout the typing animation.

## Detailed Analysis

Let me break down the analysis into several sections:

### Section One

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

Here's some **bold text** and *italic text* to test inline formatting.

### Section Three with Lists

Some important items to note:

- First item in the list
- Second item with more details
- Third item that wraps to multiple lines to see how the layout handles longer content
- Fourth item

And a numbered list:

1. Step one of the process
2. Step two with additional context
3. Step three as the final step

## Conclusion

This concludes the test response. The scrolling should have maintained a good reading position throughout the typing animation, and all markdown formatting should be rendered correctly.`
            }
          };

          const assistantMessage: ChatMessage = {
            id: `m-${Date.now()}-assistant`,
            role: 'assistant',
            content: mockResponse.data.output_text,
          };

          addMessage(assistantMessage);
          return;
        }

        // Call chat API
        const response = await window.chat.send(payload);

        // Handle error responses
        if (!response.ok) {
          const rawError: string = response.error;
          let friendly = 'Something went wrong talking to the model.';

          if (rawError.includes('No OpenAI API key configured')) {
            friendly =
              'No OpenAI API key is configured. Add one under Settings → API key to use the assistant.';
          }

          const errorMessage: ChatMessage = {
            id: `m-${Date.now()}-assistant-error`,
            role: 'assistant',
            content: friendly,
            ephemeral: true,
          };

          addMessage(errorMessage);
          return;
        }

        // Add assistant response
        const assistantText =
          response.data.output_text || 'Sorry, I could not generate a response.';

        const assistantMessage: ChatMessage = {
          id: `m-${Date.now()}-assistant`,
          role: 'assistant',
          content: assistantText,
        };

        addMessage(assistantMessage);
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
    ]
  );

  return {
    isSending,
    handleSend,
  };
}
