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
import { getContextRulesFor, type DocKindId } from '../../../models/docs';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;

  /**
   * SHOW/RENDER but DO NOT send to LLM as history
   */
  ephemeral?: boolean;

  suggestions?: SuggestionAction[];
};

interface UseChatMessagesOptions {
  threadId: string;
  kind: EditorKind;
  fullTextMarkdown: string | null;
  isTextLoaded: boolean;
  projectId?: string;
  storyId?: string;
}

// helper
function safeText(md: string | null | undefined): string {
  return (md ?? '').toString();
}

function computeMetaDocState(
  metaDocs: Record<string, any>,
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

  if (!doc || doc.json === null) return 'missing';

  const markdown = doc.markdown ?? '';
  if (!markdown.trim()) return 'empty';

  return 'hasContent';
}

function computeTargetState(isTextLoaded: boolean, fullTextMarkdown: string | null): DocState {
  if (!isTextLoaded) return 'missing';
  const text = safeText(fullTextMarkdown);
  if (!text.trim()) return 'empty';
  return 'hasContent';
}

export function useChatMessages({
  threadId,
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

  // ✅ Reset completely when switching thread/doc
  useEffect(() => {
    setMessages([]);
    hasInitialisedRef.current = false;
    previousMarkdownLength.current = 0;
  }, [threadId]);

  // If we previously initialised while empty, but now got content, allow reseed (same thread)
  useEffect(() => {
    const text = safeText(fullTextMarkdown);
    const currentLength = text.trim().length;

    if (hasInitialisedRef.current && previousMarkdownLength.current === 0 && currentLength > 0) {
      hasInitialisedRef.current = false;
    }

    previousMarkdownLength.current = currentLength;
  }, [fullTextMarkdown]);

  // ✅ Seed initial assistant hint (visible, but ephemeral => excluded from LLM history)
  useEffect(() => {
    if (!isTextLoaded || hasInitialisedRef.current) return;

    const docKind = kind as DocKindId;
    const targetState = computeTargetState(isTextLoaded, fullTextMarkdown);
    const rules = getContextRulesFor(docKind);
    const upstreamKinds = Array.from(
      new Set<MetaDocKey>([...rules.alwaysInclude, ...rules.intelligentlySelect])
    );

    const upstreamStates: Partial<Record<MetaDocKey, DocState>> = {};

    for (const key of upstreamKinds) {
      if (key === 'manifest') {
        upstreamStates[key] = computeMetaDocState(metaDocs, { kind: 'root' }, 'manifest');
      } else if (projectId && storyId) {
        upstreamStates[key] = computeMetaDocState(metaDocs, { kind: 'story', projectId, storyId }, key);
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
          id: `hint:${threadId}`,
          role: 'assistant',
          content: hint.introMessage,
          suggestions: hint.actions,
          ephemeral: true, // ✅ render but exclude from LLM history (your intended meaning)
        },
      ]);
    }

    hasInitialisedRef.current = true;
  }, [threadId, kind, isTextLoaded, fullTextMarkdown, metaDocs, projectId, storyId]);

  const addMessage = (message: ChatMessage) => setMessages((prev) => [...prev, message]);
  const addMessages = (newMessages: ChatMessage[]) => setMessages((prev) => [...prev, ...newMessages]);

  return { messages, addMessage, addMessages };
}