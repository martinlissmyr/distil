// src/ui/playground/PlaygroundOutput.tsx
import React, { useState } from 'react';
import { Title, SegmentedControl, Code, Text, Group, CopyButton, Button, Box, Stack, Badge, Paper } from '@mantine/core';
import { Copy, Check } from 'lucide-react';

type PlaygroundOutputProps = {
  systemPrompt: string;
  assistantPrompt: string;
  userPrompt: string;
  includedContexts: string[];
};

export const PlaygroundOutput: React.FC<PlaygroundOutputProps> = ({
  systemPrompt,
  assistantPrompt,
  userPrompt,
  includedContexts,
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
      <Box
        radius="none"
        p={10}
      >

        <Paper
          radius="sm"
          p={10}
        >
          <Stack gap="sm">
            {includedContexts.length > 0 && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">Included contexts:</Text>
                {includedContexts.map(ctx => (
                  <Badge key={ctx} size="sm" variant="light">{ctx}</Badge>
                ))}
              </Group>
            )}
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
        </Paper>
      </Box>
      <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Code
          block
          p={15}
          bg="transparent"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
          {renderContent()}
        </Code>
      </Box>
    </Stack>
  );
};
