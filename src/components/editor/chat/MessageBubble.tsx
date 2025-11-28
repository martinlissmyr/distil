// src/components/editor/chat/MessageBubble.tsx
import React from 'react';
import { Box, Group, Text, Button } from '@mantine/core';
import type { SuggestionAction } from '../../../chat/chatHints';
import type { ChatMessage } from './useChatMessages';

type MessageBubbleProps = {
  message: ChatMessage;
  onSuggestionClick?: (action: SuggestionAction) => void;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
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
