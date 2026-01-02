// src/ui/chat/SelectionPill.tsx
import React from 'react';
import { Box, Group, Text, ActionIcon } from '@mantine/core';
import { Icon } from '../common/Icon';

type SelectionPillProps = {
  onDismiss: () => void;
};

export const SelectionPill: React.FC<SelectionPillProps> = ({ onDismiss }) => {
  return (
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
          <Icon type="selection" size={14} />
          <Text size="xs" fw={500}>
            Using selected text as context
          </Text>
        </Group>
        <ActionIcon
          size="xs"
          radius="xl"
          variant="subtle"
          onClick={onDismiss}
        >
          <Icon type="close" size={12} />
        </ActionIcon>
      </Box>
    </Group>
  );
};
