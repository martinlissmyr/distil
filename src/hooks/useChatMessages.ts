// src/hooks/useChatMessages.ts
import { useState, useEffect, useRef, useMemo } from 'react';
import type { EditorKind } from '../types/chat';
import {
  getInitialAssistantHint,
  type LocalizedSuggestionAction,
  type DocState,
} from '../chat/chatHints';
import { useAppStore, metaId } from '../state/useAppStore';
import type { MetaDocKey } from '../types/metaDoc';
import { getContextRulesFor, type DocKindId } from '../models/docs';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;

  /**
   * SHOW/RENDER but DO NOT send to LLM as history
   */
  ephemeral?: boolean;

  suggestions?: LocalizedSuggestionAction[];
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
    | { scope: 'root' }
    | { scope: 'story'; projectId: string; storyId: string },
  key: MetaDocKey
): DocState {
  const id =
    scope.scope === 'root'
      ? metaId({ scope: 'root' }, key)
      : metaId({ scope: 'story', projectId: scope.projectId, storyId: scope.storyId }, key);

  const doc = metaDocs[id];

  if (!doc || doc.json === null) return 'missing';

  const markdown = doc.markdown ?? '';
  if (!markdown.trim()) return 'empty';

  return 'hasContent';
}

function computeSelfState(isTextLoaded: boolean, fullTextMarkdown: string | null): DocState {
  if (!isTextLoaded) return 'missing';
  const text = safeText(fullTextMarkdown);
  if (!text.trim()) return 'empty';
  return 'hasContent';
}

// NOTE: keep this aligned with whatever you use when bumping docRevision.
// If the current editor is always story scoped, this is fine.
function docIdForCurrentDoc(kind: EditorKind, projectId?: string, storyId?: string): string {
  if (projectId && storyId) return `story:${projectId}:${storyId}::${kind}`;
  return `root::${kind}`;
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
  const writingLanguage = useAppStore((s) => s.writingLanguage);

  // Stable doc id for per-doc revision triggers
  const docId = useMemo(
    () => docIdForCurrentDoc(kind, projectId, storyId),
    [kind, projectId, storyId]
  );

  // Subscribe to per-doc revision; bumping this should re-seed hint
  const docRevision = useAppStore((s) => s.docRevision?.[docId] ?? 0);

  // Reset completely when switching thread/doc
  useEffect(() => {
    setMessages([]);
    hasInitialisedRef.current = false;
    previousMarkdownLength.current = 0;
  }, [threadId]);

  // If docRevision bumps (e.g. wizard inserted content), allow reseed for same thread
  useEffect(() => {
    if (!isTextLoaded) return;

    // Allow the seeding effect below to run again
    hasInitialisedRef.current = false;

    // Avoid "empty -> content" guard interfering (safe reset)
    previousMarkdownLength.current = 0;
  }, [docRevision, isTextLoaded]);

  // If we previously initialised while empty, but now got content, allow reseed (same thread)
  useEffect(() => {
    const text = safeText(fullTextMarkdown);
    const currentLength = text.trim().length;

    if (hasInitialisedRef.current && previousMarkdownLength.current === 0 && currentLength > 0) {
      hasInitialisedRef.current = false;
    }

    previousMarkdownLength.current = currentLength;
  }, [fullTextMarkdown]);

  // Seed initial assistant hint (visible, but ephemeral => excluded from LLM history)
  useEffect(() => {
    if (!isTextLoaded || hasInitialisedRef.current) return;

    let cancelled = false;

    (async () => {
      const docKind = kind as DocKindId;
      const selfState = computeSelfState(isTextLoaded, fullTextMarkdown);
      const rules = getContextRulesFor(docKind);

      const upstreamKinds = Array.from(
        new Set<MetaDocKey>([...rules.alwaysInclude, ...rules.intelligentlySelect])
      );

      const upstreamStates: Partial<Record<MetaDocKey, DocState>> = {};

      for (const key of upstreamKinds) {
        if (key === 'manifest') {
          upstreamStates[key] = computeMetaDocState(metaDocs, { scope: 'root' }, 'manifest');
        } else if (projectId && storyId) {
          upstreamStates[key] = computeMetaDocState(
            metaDocs,
            { scope: 'story', projectId, storyId },
            key
          );
        } else {
          upstreamStates[key] = 'missing';
        }
      }

      const hint = await getInitialAssistantHint({
        kind: docKind,
        selfState,
        upstream: upstreamStates,
        language: writingLanguage,
      });

      if (cancelled) return;

      if (hint) {
        setMessages([
          {
            id: `hint:${threadId}`,
            role: 'assistant',
            content: hint.introMessage,
            suggestions: hint.actions,
            ephemeral: true,
          },
        ]);
      }

      hasInitialisedRef.current = true;
    })().catch((err) => {
      console.error('[useChatMessages] Failed to seed initial hint:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [
    threadId,
    kind,
    isTextLoaded,
    fullTextMarkdown,
    metaDocs,
    projectId,
    storyId,
    writingLanguage,
    docRevision, // important: re-run when wizard bumps revision
  ]);

  const addMessage = (message: ChatMessage) => setMessages((prev) => [...prev, message]);
  const addMessages = (newMessages: ChatMessage[]) => setMessages((prev) => [...prev, ...newMessages]);

  return { messages, addMessage, addMessages };
}