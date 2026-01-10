// src/ui/chat/SelectionPill.tsx
import React from 'react';
import { Box, Group, Text, ActionIcon, Flex } from '@mantine/core';
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
        <Flex gap="4px">
          <Icon type="selection" size={14} style={{ flex: 0 }}/>
          <Text size="xs" fw={500} style={{ flex: 1, overflow: 'ellipsis' }} lineClamp={1}>
            Using selected text as context
          </Text>
        </Flex>
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
