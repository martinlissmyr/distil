// src/components/editor/chat/MessageBubble.tsx
import React, { useState, useEffect } from 'react';
import { Icon } from '../../common/Icon';
import { Box, Group, Text, Button, Stack } from '@mantine/core';
import type { SuggestionAction } from '../../../chat/chatHints';
import type { ChatMessage } from './useChatMessages';
import { MarkdownContent } from './MarkdownContent';

type MessageBubbleProps = {
  message: ChatMessage;
  onSuggestionClick?: (action: SuggestionAction) => void;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSuggestionClick,
}) => {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(isUser);
  const [visibleActions, setVisibleActions] = useState<number>(0);

  // Typing animation for assistant messages
  useEffect(() => {
    if (isUser) {
      setDisplayedContent(message.content);
      setIsTypingComplete(true);
      return;
    }

    setDisplayedContent('');
    setIsTypingComplete(false);
    setVisibleActions(0);

    const content = message.content;
    const typingSpeed = 10; // ms per character
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTypingComplete(true);
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [message.content, isUser]);

  // Staggered animation for action buttons
  useEffect(() => {
    if (!isTypingComplete || !message.suggestions || message.suggestions.length === 0) {
      return;
    }

    setVisibleActions(0);
    const totalActions = message.suggestions.length;
    let currentAction = 0;

    const staggerDelay = 80; // ms between each button
    const interval = setInterval(() => {
      if (currentAction < totalActions) {
        currentAction++;
        setVisibleActions(currentAction);
      } else {
        clearInterval(interval);
      }
    }, staggerDelay);

    return () => clearInterval(interval);
  }, [isTypingComplete, message.suggestions]);

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
          <Text size="sm" mb="2" c="dimmed" style={{
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            fontSize: "10px",
            textAlign: "right"
          }}>
            You:
          </Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', textAlign: "right" }}>
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
          <Text size="sm" mb="2" style={{
            textStyle: "italic",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            fontSize: "10px",
            opacity: "0.5"
          }}>
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
            <MarkdownContent content={displayedContent} />
          </Box>

          {isTypingComplete &&
            message.suggestions &&
            message.suggestions.length > 0 && (
              <Stack mt="sm" gap="sm" align="flex-end" style={{ overflow: 'hidden' }}>
                {message.suggestions.map((action, index) => (
                  <Box
                    key={action.id}
                    style={{
                      opacity: index < visibleActions ? 1 : 0,
                      transform: index < visibleActions ? 'translateX(0) scale(1)' : 'translateX(20px) scale(0.95)',
                      transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                    }}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      radius="xl"
                      onClick={() => onSuggestionClick?.(action)}
                      leftSection={<Icon type={action.kind}/>}
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
};
