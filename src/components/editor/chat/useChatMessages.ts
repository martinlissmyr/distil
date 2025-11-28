// src/components/editor/chat/useChatMessages.ts
import { useState, useEffect, useRef } from 'react';
import type { EditorKind } from '../../../types/chat';
import { getInitialAssistantHint, SuggestionAction } from '../../../chat/chatHints';
import { useAppStore, metaId } from '../../../state/useAppStore';
import type { MetaDocKey } from '../../../types/metaDoc';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ephemeral?: boolean;
  suggestions?: SuggestionAction[];
};

interface UseChatMessagesOptions {
  kind: EditorKind;
  fullTextMarkdown: string | null;
  isTextLoaded: boolean;
  projectId?: string;
  storyId?: string;
}

/**
 * Manages chat message state and initialization
 */
export function useChatMessages({
  kind,
  fullTextMarkdown,
  isTextLoaded,
  projectId,
  storyId
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const hasInitialisedRef = useRef(false);
  const previousMarkdownLength = useRef(0);
  const metaDocs = useAppStore((s) => s.metaDocs);

  // Helper to check if a metaDoc exists and has content
  const hasMetaDoc = (key: MetaDocKey): boolean => {
    if (!projectId || !storyId) return false;
    const id = metaId({ kind: 'story', projectId, storyId }, key);
    const doc = metaDocs[id];
    return doc?.json !== null && !doc?.isLoading;
  };

  // Reset initialization if content loads after being detected as empty
  useEffect(() => {
    const currentLength = fullTextMarkdown?.trim().length ?? 0;
    // If we previously initialized with empty content, but now have content, reset
    if (hasInitialisedRef.current && previousMarkdownLength.current === 0 && currentLength > 0) {
      hasInitialisedRef.current = false;
    }
    previousMarkdownLength.current = currentLength;
  }, [fullTextMarkdown]);

  // Initial ephemeral assistant message with suggestions
  useEffect(() => {
    // Don't seed until we know whether the text is empty or not
    if (!isTextLoaded || hasInitialisedRef.current) return;

    const isEmpty = !fullTextMarkdown?.trim();

    // Check metaDoc existence
    const hasBrief = hasMetaDoc('brief');
    const hasOutline = hasMetaDoc('outline');

    // For manifest, check root level
    const manifestId = metaId({ kind: 'root' }, 'manifest');
    const hasManifest = metaDocs[manifestId]?.json !== null && !metaDocs[manifestId]?.isLoading;

    const hint = getInitialAssistantHint({
      kind,
      isEmpty,
      hasBrief,
      hasOutline,
      hasManifest,
    });

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
  }, [kind, isTextLoaded, fullTextMarkdown, metaDocs, projectId, storyId]);

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
