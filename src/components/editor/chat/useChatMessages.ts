// src/components/editor/chat/useChatMessages.ts
import { useState, useEffect, useRef } from 'react';
import type { EditorKind } from '../../../types/chat';
import {
  getInitialAssistantHint,
  type SuggestionAction,
  type DocState,
} from '../../../chat/chatHints';
import { useAppStore, metaId } from '../../../state/useAppStore';
import type { MetaDocKey } from '../../../types/metaDoc';
import { getContextRulesFor, type DocKindId } from '../../../docs';

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
 * Compute a generic DocState for a meta doc, based on store state.
 */
function computeMetaDocState(
  metaDocs: ReturnType<typeof useAppStore>['metaDocs'],
  scope:
    | { kind: 'root' }
    | { kind: 'story'; projectId: string; storyId: string },
  key: MetaDocKey
): DocState {
  const id =
    scope.kind === 'root'
      ? metaId({ kind: 'root' }, key)
      : metaId({ kind: 'story', projectId: scope.projectId, storyId: scope.storyId }, key);

  const doc = metaDocs[id];

  if (!doc || doc.json === null) {
    return 'missing';
  }

  const markdown = doc.markdown ?? '';
  if (!markdown.trim()) {
    return 'empty';
  }

  return 'hasContent';
}

/**
 * Compute DocState for the main editor document.
 * (We only distinguish after isTextLoaded === true.)
 */
function computeTargetState(
  isTextLoaded: boolean,
  fullTextMarkdown: string | null
): DocState {
  if (!isTextLoaded) return 'missing';
  const text = fullTextMarkdown ?? '';
  if (!text.trim()) return 'empty';
  return 'hasContent';
}

/**
 * Manages chat message state and initialization
 */
export function useChatMessages({
  kind,
  fullTextMarkdown,
  isTextLoaded,
  projectId,
  storyId,
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const hasInitialisedRef = useRef(false);
  const previousMarkdownLength = useRef(0);
  const metaDocs = useAppStore((s) => s.metaDocs);

  // Reset initialization if content loads after being detected as empty
  useEffect(() => {
    const currentLength = fullTextMarkdown?.trim().length ?? 0;
    // If we previously initialized with empty content, but now have content, reset
    if (
      hasInitialisedRef.current &&
      previousMarkdownLength.current === 0 &&
      currentLength > 0
    ) {
      hasInitialisedRef.current = false;
    }
    previousMarkdownLength.current = currentLength;
  }, [fullTextMarkdown]);

  // Initial ephemeral assistant message with suggestions
  useEffect(() => {
    // Don't seed until we know whether the text is empty or not
    if (!isTextLoaded || hasInitialisedRef.current) return;

    const targetState = computeTargetState(isTextLoaded, fullTextMarkdown);

    // Determine which upstream docs are relevant for this editor kind
    const docKind = kind as DocKindId;
    const rules = getContextRulesFor(docKind);
    const upstreamKinds = Array.from(
      new Set<MetaDocKey>([...rules.alwaysInclude, ...rules.intelligentlySelect])
    );

    const upstreamStates: Record<MetaDocKey, DocState> = {} as any;

    for (const key of upstreamKinds) {
      if (key === 'manifest') {
        // root-level manifest
        upstreamStates[key] = computeMetaDocState(metaDocs, { kind: 'root' }, 'manifest');
      } else if (projectId && storyId) {
        upstreamStates[key] = computeMetaDocState(
          metaDocs,
          { kind: 'story', projectId, storyId },
          key
        );
      } else {
        upstreamStates[key] = 'missing';
      }
    }

    const hint = getInitialAssistantHint({
      kind: docKind,
      targetState,
      upstream: upstreamStates,
    });

    if (hint) {
      setMessages([
        {
          id: `hint-${kind}`,
          role: 'assistant',
          content: hint.introMessage,
          suggestions: hint.actions,
          ephemeral: true,
        },
      ]);
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