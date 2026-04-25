// src/ui/chat/MessageBubble.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../common/Icon';
import { Box, Group, Text, Button, Stack } from '@mantine/core';
import type { LocalizedSuggestionAction } from '../../chat/chatHints';
import type { ChatMessage } from '../../hooks/useChatMessages';
import { MarkdownContent } from '../common/MarkdownContent';
import classes from './MessageBubble.module.scss';

type MessageBubbleProps = {
  message: ChatMessage;
  onSuggestionClick?: (action: LocalizedSuggestionAction) => void;
};

const AssistantContent = React.memo(function AssistantContent({
  content,
}: {
  content: string;
}) {
  return <MarkdownContent content={content} />;
});

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  onSuggestionClick,
}) => {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(isUser);

  // Track which suggestion buttons are still shown (per message)
  const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(new Set());

  // Compute suggestions that are still visible
  const visibleSuggestions = useMemo(() => {
    const list = message.suggestions ?? [];
    if (list.length === 0) return [];
    return list.filter((a) => !hiddenSuggestionIds.has(a.id));
  }, [message.suggestions, hiddenSuggestionIds]);

  // Keep rendered message text stable so native text selection inside chat
  // bubbles is not cleared by per-character DOM replacement.
  useEffect(() => {
    setDisplayedContent(message.content);
    setIsTypingComplete(true);

    // Reset hidden suggestions whenever this message changes
    setHiddenSuggestionIds(new Set());
  }, [message.id, message.content]);

  const handleSuggestionClick = (action: LocalizedSuggestionAction) => {
    // Remove button locally immediately
    setHiddenSuggestionIds((prev) => {
      const next = new Set(prev);
      next.add(action.id);
      return next;
    });

    onSuggestionClick?.(action);
  };

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
            width: '75%',
          }}
        >
          <Text
            size="sm"
            mb="2"
            c="dimmed"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontSize: '10px',
              textAlign: 'right',
            }}
          >
            You:
          </Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', textAlign: 'right' }}>
            {message.content}
          </Text>
        </Box>
      ) : (
        <Box
          style={{
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <Text
            size="sm"
            mb="2"
            style={{
              textStyle: 'italic',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontSize: '10px',
              opacity: '0.5',
            }}
          >
            Assistant:
          </Text>
          <Box
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <AssistantContent content={displayedContent} />
          </Box>

          {isTypingComplete && visibleSuggestions.length > 0 && (
            <Stack mt="sm" gap="sm" align="flex-end" style={{ overflow: 'hidden' }}>
              {visibleSuggestions.map((action, index) => (
                <Box
                  key={action.id}
                  className={classes.suggestionAction}
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    radius="xl"
                    onClick={() => handleSuggestionClick(action)}
                    rightSection={<Icon type={action.kind} />}
                  >
                    {action.label}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Group>
  );
});
