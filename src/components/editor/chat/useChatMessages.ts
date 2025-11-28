// src/components/editor/chat/useChatMessages.ts
import { useState, useEffect, useRef } from 'react';
import type { EditorKind } from '../../../types/chat';
import { getInitialAssistantHint, SuggestionAction } from '../../../chat/chatHints';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ephemeral?: boolean;
  suggestions?: SuggestionAction[];
};

interface UseChatMessagesOptions {
  kind: EditorKind;
  fullTextMarkdown: string;
  isTextLoaded: boolean;
}

/**
 * Manages chat message state and initialization
 */
export function useChatMessages({ kind, fullTextMarkdown, isTextLoaded }: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const hasInitialisedRef = useRef(false);

  // Initial ephemeral assistant message with suggestions
  useEffect(() => {
    // Don't seed until we know whether the text is empty or not
    if (!isTextLoaded || hasInitialisedRef.current) return;

    const isEmpty = !fullTextMarkdown.trim();
    const hint = getInitialAssistantHint({ kind, isEmpty });

    if (hint) {
      setMessages([{
        id: `hint-${kind}`,
        role: 'assistant',
        content: hint.introMessage,
        suggestions: hint.actions,
        ephemeral: true,
      }]);
    }

    hasInitialisedRef.current = true;
  }, [kind, isTextLoaded, fullTextMarkdown]);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const addMessages = (newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
  };

  return {
    messages,
    addMessage,
    addMessages,
  };
}
