import React from 'react';
import { Box, Flex, Group, Text } from '@mantine/core';
import { Icon } from '../common/Icon';

type ChapterContextPillProps = {
  chapterNumber: number;
};

export const ChapterContextPill: React.FC<ChapterContextPillProps> = ({ chapterNumber }) => (
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
        <Icon type="parts" size={14} style={{ flex: 0 }} />
        <Text size="xs" fw={500} style={{ flex: 1, overflow: 'ellipsis' }} lineClamp={1}>
          Using chapter {chapterNumber} as context
        </Text>
      </Flex>
    </Box>
  </Group>
);
