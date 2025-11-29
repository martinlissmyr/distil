// src/components/editor/EditorChatAside.tsx
import React, { useState } from 'react';
import {
  Box,
  Stack,
  ScrollArea,
  Textarea,
  Button,
  Group,
  Loader,
} from '@mantine/core';

import type { EditorKind } from '../../types/chat';
import type { SuggestionAction } from '../../chat/chatHints';

import { useChatMessages } from './chat/useChatMessages';
import { useChatSend } from './chat/useChatSend';
import { useChatScroll } from './chat/useChatScroll';
import { useScopeManager } from './chat/useScopeManager';
import { MessageBubble } from './chat/MessageBubble';
import { SelectionPill } from './chat/SelectionPill';

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
}) => {
  const [input, setInput] = useState('');

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
  const viewportRef = useChatScroll(messages.length);

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
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-editor-aside)',
        borderRadius: '12px',
      }}
    >
      {/* Messages */}
      <ScrollArea
        style={{ flex: 1, minHeight: 0 }}
        viewportRef={viewportRef}
        type="auto"
      >
        <Stack gap="xs">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}
          <Box p="xs">{isSending && <Loader size="xs" />}</Box>
        </Stack>
      </ScrollArea>

      {/* Context pill */}
      {showSelectionPill && <SelectionPill onDismiss={dismissSelectionPill} />}

      {/* Input */}
      <Box
        p="xs"
        mt="xs"
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
