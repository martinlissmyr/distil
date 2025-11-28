// src/components/playground/PlaygroundOutput.tsx
import React, { useState } from 'react';
import { Paper, Title, SegmentedControl, Code, Text, Group, CopyButton, Button, Box, Stack } from '@mantine/core';
import { Copy, Check } from 'lucide-react';

type PlaygroundOutputProps = {
  systemPrompt: string;
  assistantPrompt: string;
  userPrompt: string;
};

export const PlaygroundOutput: React.FC<PlaygroundOutputProps> = ({
  systemPrompt,
  assistantPrompt,
  userPrompt,
}) => {
  const [activeTab, setActiveTab] = useState('system');

  const renderContent = () => {
    let content = '';

    if (activeTab === 'system') {
      content = systemPrompt;
    } else if (activeTab === 'assistant') {
      content = assistantPrompt;
    } else {
      content = userPrompt;
    }

    return content;
  };

  return (
    <Stack gap="sm" style={{ flexGrow: 1, minHeight: 0 }}>
      <Stack gap="sm">
        <Title order={4}>Built Prompt Output</Title>
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          data={[
            { label: 'System Message', value: 'system' },
            { label: 'Assistant Context', value: 'assistant' },
            { label: 'User Message', value: 'user' },
          ]}
        />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Character count: {renderContent().length}
          </Text>
          <CopyButton value={renderContent()}>
            {({ copied, copy }) => (
              <Button
                size="xs"
                variant="subtle"
                leftSection={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={copy}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Stack>
      <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderContent()}</Code>
      </Box>
    </Stack>
  );
};
