// src/components/editor/EditorChatAside.tsx
import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  Box,
  Stack,
  ScrollArea,
  Textarea,
  Button,
  Group,
} from '@mantine/core';

import type { EditorKind } from '../../types/chat';
import type { SuggestionAction } from '../../chat/chatHints';
import { useAppStore } from '../../state/useAppStore';

import { useChatMessages } from './chat/useChatMessages';
import { useChatSend } from './chat/useChatSend';
import { useChatScroll } from './chat/useChatScroll';
import { useScopeManager } from './chat/useScopeManager';
import { MessageBubble } from './chat/MessageBubble';
import { SelectionPill } from './chat/SelectionPill';
import { TypingIndicator } from './chat/TypingIndicator';
import styles from './chat/ChatScrollbar.module.scss';

type EditorChatAsideProps = {
  kind: EditorKind;
  title: string;
  fullTextMarkdown: string;
  selectionMarkdown?: string;
  hasSelection?: boolean;
  onSuggestionAction?: (action: SuggestionAction) => void;
  isTextLoaded?: boolean;
  projectId?: string;
  storyId?: string;
  onNavigate?: (target: string) => void;
  editor?: any; // TipTap Editor instance for wizard integration
};

export const EditorChatAside: React.FC<EditorChatAsideProps> = ({
  kind,
  title,
  fullTextMarkdown,
  selectionMarkdown = '',
  hasSelection = false,
  onSuggestionAction,
  isTextLoaded = false,
  projectId,
  storyId,
  onNavigate,
  editor,
}) => {
  const startWizard = useAppStore((s) => s.startWizard);
  const [input, setInput] = useState('');
  const [scrollbarOffset, setScrollbarOffset] = useState(0);
  const [isScrolledTop, setIsScrolledTop] = useState(false);
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Message management
  const { messages, addMessage } = useChatMessages({
    kind,
    fullTextMarkdown,
    isTextLoaded,
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
  const { viewportRef, contentRef, spacerRef, spacerHeight } = useChatScroll(messages);

  // Measure scrollbar width on mount + resize
  useLayoutEffect(() => {
    const updateScrollbarOffset = () => {
      if (!scrollContainerRef.current) return;
      const node = scrollContainerRef.current;
      const scrollbarWidth = node.offsetWidth - node.clientWidth;
      setScrollbarOffset(scrollbarWidth);
    };

    updateScrollbarOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarOffset();
    });

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    window.addEventListener('resize', updateScrollbarOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollbarOffset);
    };
  }, []);

  const handleSuggestionClick = (action: SuggestionAction) => {
    if (action.kind === 'prompt' && action.prompt) {
      void handleSend(action.prompt, action.displayMessage);
      return;
    }

    if (action.kind === 'navigate' && action.command) {
      if (action.command.type === 'navigateToStorySection') {
        if (onNavigate) {
          onNavigate(action.command.section);
        }
      } else if (action.command.type === 'navigateToManifest') {
        if (onNavigate) {
          onNavigate('manifest');
        }
      }
      return;
    }

    if (action.kind === 'wizard' && action.command?.type === 'openWizard') {
      const wizardId = action.command.wizard;

      // Determine target scope based on editor kind
      const targetScope =
        kind === 'manifest'
          ? { kind: 'root' as const }
          : kind === 'brief' || kind === 'outline' || kind === 'prose'
          ? {
              kind: 'story' as const,
              projectId: projectId || 'unknown',
              storyId: storyId || 'unknown',
            }
          : { kind: 'root' as const };

      // Determine target key based on editor kind
      const targetKey = kind;

      // Launch the wizard
      void startWizard(wizardId, {
        editorKind: kind,
        projectId,
        storyId,
        targetScope,
        targetKey,
        targetEditor: editor,
      });
      return;
    }

    if (onSuggestionAction) {
      onSuggestionAction(action);
    }
  };

  const handleSendClick = async () => {
    await handleSend(input);
    setInput('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
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
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: scrollbarOffset,
            height: 60,
            pointerEvents: 'none',
            zIndex: 10,
            opacity: isScrolledTop ? 1 : 0,
            transition: 'opacity 120ms ease-out',
            background:
              'linear-gradient(to bottom, var(--bg-editor-aside), transparent)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        />

        {/* Messages */}
        <ScrollArea
          className={styles.chatScrollArea}
          style={{ height: '100%' }}
          viewportRef={viewportRef}
          type="auto"
          scrollbarSize={8}
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
                <MessageBubble
                  message={m}
                  onSuggestionClick={handleSuggestionClick}
                />
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
            right: scrollbarOffset,
            height: 60,
            pointerEvents: 'none',
            zIndex: 10,
            opacity: isScrolledBottom ? 1 : 0,
            transition: 'opacity 120ms ease-out',
            background:
              'linear-gradient(to top, var(--bg-editor-aside), transparent)',
          }}
        />
      </Box>

      {/* Context pill */}
      {showSelectionPill && <Box ml="xs"><SelectionPill onDismiss={dismissSelectionPill} /></Box>}

      {/* Input */}
      <Box
        p="xs"
        m="xs"
        style={{
          backgroundColor: 'var(--aside-input)',
          borderRadius: '12px',
        }}
      >
        <Textarea
          variant="unstyled"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            scope === 'selection'
              ? 'Ask something about the selected text…'
              : 'Ask anything…'
          }
          autosize
          minRows={2}
          maxRows={4}
        />
        <Group justify="flex-end" mt={4}>
          <Button
            size="xs"
            onClick={handleSendClick}
            disabled={isSending || !input.trim()}
          >
            Ask
          </Button>
        </Group>
      </Box>
    </Box>
  );
};
