// src/ui/chat/ChatAside.tsx
import React, { useState, useRef } from 'react';
import { Box, Stack, ScrollArea, Textarea, Button, Group } from '@mantine/core';

import type { EditorKind } from '../../types/chat';
import type { LocalizedSuggestionAction } from '../../chat/chatHints';
import type { DocRefWithKind } from '../../types/docRef';

import { useChatMessages } from '../../hooks/useChatMessages';
import { useChatSend } from '../../hooks//useChatSend';
import { useChatScroll } from '../../hooks//useChatScroll';
import { useScopeManager } from '../../hooks//useScopeManager';
import { MessageBubble } from './MessageBubble';
import { SelectionPill } from './SelectionPill';
import { TypingIndicator } from './TypingIndicator';
import styles from './ChatAside.module.scss';

// docs-model driven scope
import { getDocScope } from '../../models/docs';

type ChatAsideProps = {
  /**
   * Preferred API: pass a doc-ref and let parent own routing/wizard wiring.
   */
  doc?: DocRefWithKind;

  /**
   * Back-compat props (will be removed later).
   */
  kind?: EditorKind;
  projectId?: string;
  storyId?: string;

  title: string;
  fullTextMarkdown: string;

  selectionMarkdown?: string;
  hasSelection?: boolean;
  isTextLoaded?: boolean;

  /**
   * Called for any suggestion action (for analytics / orchestration).
   */
  onSuggestionAction?: (action: LocalizedSuggestionAction) => void;

  /**
   * Existing navigation callback (kept as-is).
   */
  onNavigate?: (target: string) => void;

  /**
   * Wizard boundary. Parent decides how to start wizard (engine/store/etc).
   */
  onOpenWizard?: (args: { wizardId: string; doc: DocRefWithKind; editor?: any }) => void;

  /**
   * TipTap instance (optional, only used when opening wizards).
   */
  editor?: any;
};

function resolveDocRef(props: ChatAsideProps): DocRefWithKind {
  if (props.doc) return props.doc;

  const docKind = props.kind;
  if (!docKind) {
    // This should basically never happen, but prevents runtime crashes.
    // Default to root to avoid hard-coding story fallback.
    return { scope: 'root', docKind: 'manifest' as EditorKind };
  }

  const scope = getDocScope(docKind); // 'root' | 'project' | 'story'

  if (scope === 'root') {
    return { scope: 'root', docKind };
  }

  if (scope === 'project') {
    if (!props.projectId) {
      console.warn('[ChatAside] project scope doc is missing projectId:', docKind);
      // fallback so caller sees something consistent
      return { scope: 'project', docKind, projectId: 'unknown' };
    }
    return { scope: 'project', docKind, projectId: props.projectId };
  }

  // scope === 'story'
  if (!props.projectId || !props.storyId) {
    console.warn('[ChatAside] story scope doc is missing projectId/storyId:', docKind);
    return {
      scope: 'story',
      docKind,
      projectId: props.projectId ?? 'unknown',
      storyId: props.storyId ?? 'unknown',
    };
  }

  return {
    scope: 'story',
    docKind,
    projectId: props.projectId,
    storyId: props.storyId,
  };
}

export const ChatAside: React.FC<ChatAsideProps> = (props) => {
  const {
    title,
    fullTextMarkdown,
    selectionMarkdown = '',
    hasSelection = false,
    onSuggestionAction,
    onNavigate,
    onOpenWizard,
    editor,
  } = props;

  const doc = resolveDocRef(props);
  const effectiveIsTextLoaded = props.isTextLoaded ?? fullTextMarkdown !== null;
  const kind = doc.docKind;

  const [input, setInput] = useState('');
  const [isScrolledTop, setIsScrolledTop] = useState(false);
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const projectId = doc.scope === 'story' || doc.scope === 'project' ? doc.projectId : undefined;
  const storyId = doc.scope === 'story' ? doc.storyId : undefined;

  function getThreadId(doc: DocRefWithKind): string {
    if (doc.scope === 'root') return `root:${doc.docKind}`;
    if (doc.scope === 'project') return `project:${doc.projectId}:${doc.docKind}`;
    return `story:${doc.projectId}:${doc.storyId}:${doc.docKind}`;
  }

  const threadId = getThreadId(doc);

  const { messages, addMessage, isInitializing } = useChatMessages({
    threadId,
    kind,
    fullTextMarkdown,
    isTextLoaded: effectiveIsTextLoaded,
    projectId,
    storyId,
  });

  // Scope management (selection vs full text)
  const { scope, showSelectionPill, dismissSelectionPill } = useScopeManager({
    hasSelection,
  });

  // Chat API handling
  const { isSending, handleSend } = useChatSend({
    kind,
    title,
    scope,
    fullTextMarkdown,
    selectionMarkdown,
    messages,
    addMessage,
    projectId,
    storyId,
  });

  // Auto-scroll behavior
  const { viewportRef, contentRef, spacerRef, spacerHeight } = useChatScroll(messages, isInitializing);

  const handleSuggestionClick = (action: LocalizedSuggestionAction) => {
    // Always notify parent if it wants to observe actions
    onSuggestionAction?.(action);

    // Keep local behavior for prompt + navigate (wizard is delegated out)
    if (action.kind === 'prompt' && action.prompt) {
      void handleSend(action.prompt, action.displayMessage);
      return;
    }

    if (action.kind === 'navigate' && action.command) {
      if (action.command.type === 'navigateToStorySection') {
        onNavigate?.(action.command.section);
      } else if (action.command.type === 'navigateToManifest') {
        onNavigate?.('manifest');
      }
      return;
    }

    if (action.kind === 'wizard' && action.command?.type === 'openWizard') {
      const wizardId = action.command.wizardId;

      if (!onOpenWizard) {
        console.warn('[ChatAside] wizard suggestion received but no onOpenWizard handler provided');
        return;
      }

      onOpenWizard({ wizardId, doc, editor });
      return;
    }
  };

  const handleSendClick = async () => {
    setInput('');
    await handleSend(input);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendClick();
    }
  };

  return (
    <Box
      ref={scrollContainerRef}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-editor-aside)',
        borderRadius: '12px',
        position: 'relative',
      }}
    >
      {/* Messages container with overlays */}
      <Box style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Top overlay */}
        <Box className={styles.topOverlay}
          style={{
            opacity: isScrolledTop ? 1 : 0,
          }}
        />

        {/* Messages */}
        <ScrollArea
          className={styles.chatScrollArea}
          style={{ height: '100%' }}
          viewportRef={viewportRef}
          type="hover"
          scrollbarSize={10}
          styles={{
            thumb: {
              zIndex: 20, // over topOverlay
            }
          }}
          onScrollPositionChange={(position) => {
            const viewport = viewportRef.current;
            if (!viewport) return;

            const scrollTop = position.y;
            const scrollHeight = viewport.scrollHeight;
            const clientHeight = viewport.clientHeight;

            setIsScrolledTop(scrollTop > 0);
            setIsScrolledBottom(scrollTop + clientHeight < scrollHeight - 5);
          }}
        >
          <Stack gap="xl" p="md" ref={contentRef}>
            {messages.map((m) => (
              <Box key={m.id} data-message-bubble>
                <MessageBubble message={m} onSuggestionClick={handleSuggestionClick} />
              </Box>
            ))}
            {isSending && <TypingIndicator />}

            {/* Spacer to allow scrolling user message to desired offset */}
            {spacerHeight > 0 && (
              <Box
                ref={spacerRef}
                style={{
                  height: spacerHeight,
                }}
              />
            )}
          </Stack>
        </ScrollArea>

        {/* Bottom overlay */}
        <Box
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            pointerEvents: 'none',
            zIndex: 10,
            opacity: isScrolledBottom ? 1 : 0,
            transition: 'opacity 120ms ease-out',
            background: 'linear-gradient(to top, var(--bg-editor-aside), transparent)',
          }}
        />
      </Box>

      {/* Context pill */}
      {showSelectionPill && (
        <Box ml="xs">
          <SelectionPill onDismiss={dismissSelectionPill} />
        </Box>
      )}

      {/* Input */}
      <Box
        p="xs"
        m="xs"
        style={{
          backgroundColor: 'var(--aside-input)',
          borderRadius: '10px',
        }}
      >
        <ScrollArea.Autosize
          mah={200}
          type="hover"
          scrollbarSize={10}
          offsetScrollbars
        >
          <Textarea
            variant="unstyled"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={scope === 'selection' ? 'Ask something about the selected text…' : 'Ask anything…'}
            autosize
            minRows={2}
            radius={0}
            classNames={{
              input: styles.textArea
            }}
          />
        </ScrollArea.Autosize>
        <Group justify="flex-end" mt={4}>
          <Button
            size="xs"
            onClick={handleSendClick}
            disabled={isSending || !input.trim()}
            classNames={{
              root: styles.chatButton,
            }}
          >
            Ask
          </Button>
        </Group>
      </Box>
    </Box>
  );
};