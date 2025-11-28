// src/components/editor/EditorChatAside.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Stack,
  ScrollArea,
  Text,
  Textarea,
  Button,
  Group,
  Loader,
  ActionIcon,
} from '@mantine/core';
import { X, TextSelect } from 'lucide-react';

import {
  buildPrompt,
  EditorKind,
  QuestionScope,
} from '../../chat/buildPrompt';
import {
  getInitialAssistantHint,
  SuggestionAction,
} from '../../chat/chatHints';

// ---- Bubbles ----

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ephemeral?: boolean;
  suggestions?: SuggestionAction[];
};

type MessageBubbleProps = {
  message: ChatMessage;
  onSuggestionClick?: (action: SuggestionAction) => void;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSuggestionClick,
}) => {
  const isUser = message.role === 'user';

  return (
    <Group
      justify={isUser ? 'flex-end' : 'flex-start'}
      style={{ width: '100%' }}
    >
      {isUser ? (
        <Box
          p="sm"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            borderRadius: '12px',
            backgroundColor: 'var(--aside-bubble)',
            minWidth: '75%',
          }}
        >
          <Text size="xs" c="dimmed" mb={2}>
            You
          </Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Text>
        </Box>
      ) : (
        <Box
          p="xs"
          style={{
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Text>

          {message.suggestions && message.suggestions.length > 0 && (
            <Group mt={16} gap={6} wrap="wrap">
              {message.suggestions.map((action) => (
                <Button
                  key={action.id}
                  size="xs"
                  variant="outline"
                  radius="xl"
                  onClick={() => onSuggestionClick?.(action)}
                >
                  {action.label}
                </Button>
              ))}
            </Group>
          )}
        </Box>
      )}
    </Group>
  );
};

// ---- Main component ----

type EditorChatAsideProps = {
  kind: EditorKind;
  title: string;
  fullTextMarkdown: string;
  selectionMarkdown?: string;
  hasSelection?: boolean;
  onSuggestionAction?: (action: SuggestionAction) => void;
  isTextLoaded?: boolean;
};

export const EditorChatAside: React.FC<EditorChatAsideProps> = ({
  kind,
  title,
  fullTextMarkdown,
  selectionMarkdown = '',
  hasSelection = false,
  onSuggestionAction,
  isTextLoaded = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [scope, setScope] = useState<QuestionScope>(
    hasSelection ? 'selection' : 'text'
  );
  const [selectionPillDismissed, setSelectionPillDismissed] = useState(false);
  const hasInitialisedRef = useRef(false);

  // Initial ephemeral assistant message + actions
  useEffect(() => {
    // don’t seed until we *know* whether the text is empty or not
    if (!isTextLoaded) return;
    if (hasInitialisedRef.current) return;

    const isEmpty = !fullTextMarkdown.trim();
    const hint = getInitialAssistantHint({ kind, isEmpty });

    if (hint) {
      setMessages((prev) => [
        ...prev,
        {
          id: `hint-${kind}`,
          role: 'assistant',
          content: hint.introMessage,
          actions: hint.actions,
          ephemeral: true,
        },
      ]);
    }

    hasInitialisedRef.current = true;
  }, [kind, isTextLoaded, fullTextMarkdown]);

  // When selection changes from editor, auto-switch scope
  useEffect(() => {
    if (hasSelection && !selectionPillDismissed) {
      setScope('selection');
    } else {
      setScope('text');
    }

    if (!hasSelection) {
      setSelectionPillDismissed(false);
    }
  }, [hasSelection, selectionPillDismissed]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSuggestionClick = (action: SuggestionAction) => {
    if (action.kind === 'prompt' && action.prompt) {
      void handleSend(action.prompt);
      return;
    }

    if (onSuggestionAction) {
      onSuggestionAction(action);
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const rawInput = promptOverride ?? input;
    const rawUserPrompt = rawInput.trim();
    if (!rawUserPrompt || isSending) return;

    const userMessage: ChatMessage = {
      id: `m-${Date.now()}-user`,
      role: 'user',
      content: rawUserPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptOverride) setInput('');
    setIsSending(true);

    try {
      const MAX_TURNS = 4;
      const history = messages
        .concat(userMessage)
        .filter((m) => !m.ephemeral)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      const turns = history.slice(-MAX_TURNS);

      const prompt = buildPrompt({
        rawUserPrompt,
        kind,
        title,
        scope,
        fullTextMarkdown,
        selectionMarkdown,
      });

      const payload = {
        messages: [
          { role: 'system' as const, content: prompt.system },
          { role: 'assistant' as const, content: prompt.assistant },
          ...turns,
          { role: 'user' as const, content: prompt.user },
        ],
      };

      const response = await window.chat.send(payload);

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

        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const assistantText =
        response.data.output_text || 'Sorry, I could not generate a response.';

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-error`,
          role: 'assistant',
          content: 'Something went wrong talking to the model.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const showSelectionPill =
    scope === 'selection' && hasSelection && !selectionPillDismissed;

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
      {showSelectionPill && (
        <Group mb={6} justify="flex-start">
          <Box
            px={10}
            py={4}
            style={{
              borderRadius: 999,
              backgroundColor: 'var(--aside-button)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Group gap="4px">
              <TextSelect size={14} strokeWidth={2} />
              <Text size="xs" fw={500}>
                Using selected text as context
              </Text>
            </Group>
            <ActionIcon
              size="xs"
              radius="xl"
              variant="subtle"
              onClick={() => {
                setSelectionPillDismissed(true);
                setScope('text');
              }}
            >
              <X size={12} />
            </ActionIcon>
          </Box>
        </Group>
      )}

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
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
          >
            Ask
          </Button>
        </Group>
      </Box>
    </Box>
  );
};