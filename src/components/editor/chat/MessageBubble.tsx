// src/components/editor/chat/MessageBubble.tsx
import React from 'react';
import { Box, Group, Text, Button, Stack } from '@mantine/core';
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
            width: '75%',
          }}
        >
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            <b>You:</b> {message.content}
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
            <b>Assistant:</b> {message.content}
          </Text>

          {message.suggestions && message.suggestions.length > 0 && (
            <Stack mt="lg" gap="sm" align="flex-end">
              {message.suggestions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant="outline"
                  radius="xl"
                  onClick={() => onSuggestionClick?.(action)}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Group>
  );
};
