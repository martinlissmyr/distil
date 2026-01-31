// src/hooks/useChatMessages.ts
import { useState, useEffect, useRef, useMemo } from 'react';
import type { EditorKind } from '../types/chat';
import {
  getInitialAssistantHint,
  type LocalizedSuggestionAction,
  type DocState,
} from '../chat/chatHints';
import { useAppStore } from '../state/useAppStore';
import type { MetaDocKey } from '../types/metaDoc';
import { getContextRulesFor, type DocKindId } from '../models/docs';
import { computeDocState } from '../models/docs/docState';
import { client } from '../api/client';
import type { ChatThread } from '../../electron/fs/fs';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;

  /**
   * SHOW/RENDER but DO NOT send to LLM as history
   */
  ephemeral?: boolean;

  suggestions?: LocalizedSuggestionAction[];

  /**
   * Actual prompt sent to API (for user messages from suggestions)
   * When present, this is sent to LLM instead of `content`
   * Used to preserve the full context when rehydrating chat history
   */
  actualPrompt?: string;

  /**
   * Skip typing animation (for restored messages from disk)
   */
  skipAnimation?: boolean;
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
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialisedRef = useRef(false);
  const previousMarkdownLength = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const metaDocs = useAppStore((s) => s.metaDocs);
  const writingLanguage = useAppStore((s) => s.writingLanguage);

  // Stable doc id for per-doc revision triggers
  const docId = useMemo(
    () => docIdForCurrentDoc(kind, projectId, storyId),
    [kind, projectId, storyId]
  );

  // Subscribe to per-doc revision; bumping this should re-seed hint
  const docRevision = useAppStore((s) => s.docRevision?.[docId] ?? 0);

  // Load chat history when switching thread/doc
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Load persisted chat history
      const response = await client.loadChatThread(threadId);

      if (cancelled) return;

      if (response.ok && response.data) {
        // Restore messages (filter out ephemeral, they'll be regenerated)
        const restoredMessages = response.data.messages.map(m => ({
          ...m,
          // Ephemeral messages are not persisted, so all restored messages are non-ephemeral
          ephemeral: false,
          suggestions: undefined, // Suggestions are not persisted
          skipAnimation: true, // Don't animate restored messages
        }));
        setMessages(restoredMessages);
        setHasLoadedHistory(true);
        setIsInitializing(true); // Reset for new thread
      } else {
        // No history found or error - start fresh
        setMessages([]);
        setHasLoadedHistory(true);
        setIsInitializing(true); // Reset for new thread
      }

      hasInitialisedRef.current = false;
      previousMarkdownLength.current = 0;
    })().catch(err => {
      console.error('[useChatMessages] Failed to load chat history:', err);
      setMessages([]);
      setHasLoadedHistory(true);
      setIsInitializing(true); // Reset for new thread
    });

    return () => {
      cancelled = true;
    };
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
    if (!isTextLoaded || !hasLoadedHistory || hasInitialisedRef.current) return;

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
          upstreamStates[key] = await computeDocState('manifest', { scope: 'root' }, {
            metaDocs,
            loadEntityIndex: client.loadEntityIndex,
          });
        } else if (projectId && storyId) {
          upstreamStates[key] = await computeDocState(
            key,
            { scope: 'story', projectId, storyId },
            {
              metaDocs,
              loadEntityIndex: client.loadEntityIndex,
            }
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
        // Append hint to end of existing messages (after loaded history)
        setMessages(prev => [
          ...prev,
          {
            id: `hint:${threadId}:${Date.now()}`,
            role: 'assistant',
            content: hint.introMessage,
            suggestions: hint.actions,
            ephemeral: true,
          },
        ]);
        hasInitialisedRef.current = true;
        setIsInitializing(false); // Mark initialization complete
      } else {
        // No hint to seed, initialization is complete
        hasInitialisedRef.current = true;
        setIsInitializing(false);
      }
    })().catch((err) => {
      console.error('[useChatMessages] Failed to seed initial hint:', err);
      setIsInitializing(false); // Mark initialization complete even on error
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
    hasLoadedHistory,
  ]);

  // Debounced save: persist non-ephemeral messages 1 second after changes
  useEffect(() => {
    // Only save if we have history loaded and messages exist
    if (!hasLoadedHistory || messages.length === 0) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      // Filter out ephemeral messages and limit to 100
      const persistableMessages = messages
        .filter(m => !m.ephemeral)
        .slice(-100)
        .map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          actualPrompt: m.actualPrompt,
          // Don't persist ephemeral or suggestions
        }));

      if (persistableMessages.length > 0) {
        const thread: ChatThread = {
          threadId,
          messages: persistableMessages,
          createdAt: new Date().toISOString(), // Will be preserved if thread already exists
          lastUpdated: new Date().toISOString(),
        };

        client.saveChatThread(thread).catch(err => {
          console.error('[useChatMessages] Failed to save chat thread:', err);
        });
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, threadId, hasLoadedHistory]);

  const addMessage = (message: ChatMessage) => setMessages((prev) => [...prev, message]);
  const addMessages = (newMessages: ChatMessage[]) => setMessages((prev) => [...prev, ...newMessages]);

  return { messages, addMessage, addMessages, isInitializing };
}