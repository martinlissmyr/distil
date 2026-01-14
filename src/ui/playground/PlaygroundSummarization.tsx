// src/ui/playground/PlaygroundSummarization.tsx
import React, { useState } from 'react';
import { Box, Stack, Group, Button, Paper, SegmentedControl, Code, Text, CopyButton } from '@mantine/core';
import { Copy, Check } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { proseJsonToMarkdown } from '../../helpers/markdownUtils';
import { generateProjectionSummary } from '../../services/projectionUtils';
import { createExtensionsFromConfig } from '../editor/primitives/editorConfigFactory';
import { proseEditorConfig } from '../../models/docs/editorConfig';

type TabValue = 'system' | 'assistant' | 'user' | 'summary';

export const PlaygroundSummarization: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('summary');
  const [result, setResult] = useState<{
    systemPrompt: string;
    assistantPrompt: string;
    userPrompt: string;
    summary: string;
    error?: string;
  } | null>(null);

  // Create TipTap editor with prose schema
  const editor = useEditor({
    extensions: createExtensionsFromConfig(proseEditorConfig),
    content: { type: 'doc', content: [] },
  });

  const handleSummarize = async () => {
    if (!editor) return;

    setLoading(true);
    try {
      const doc = editor.getJSON();
      const markdown = proseJsonToMarkdown(doc);

      if (!markdown.trim()) {
        setResult({
          systemPrompt: '',
          assistantPrompt: '',
          userPrompt: '',
          summary: '',
          error: 'Please enter some chapter text first.',
        });
        setActiveTab('summary');
        setLoading(false);
        return;
      }

      const summaryResult = await generateProjectionSummary(markdown);
      setResult(summaryResult);
      setActiveTab('summary'); // Switch to summary tab to show result
    } catch (error) {
      setResult({
        systemPrompt: '',
        assistantPrompt: '',
        userPrompt: '',
        summary: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setActiveTab('summary');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!result) return 'Click "Summarize" to generate a summary...';
    if (activeTab === 'system') return result.systemPrompt;
    if (activeTab === 'assistant') return result.assistantPrompt;
    if (activeTab === 'user') return result.userPrompt;
    return result.error || result.summary;
  };

  const content = renderContent();

  return (
    <Group gap="md" style={{ flex: 1, minHeight: 0 }} grow align="flex-start">
      {/* Left Column - Editor */}
      <Stack gap="sm" style={{ flex: 1, minHeight: 0, height: '100%' }}>
        <Paper p="md" radius="sm" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 4,
              padding: 0
            }}
          >
            <EditorContent editor={editor} style={{
              minHeight: '100%',
              padding: 10
            }}/>
          </Box>
          <Button
            mt="sm"
            onClick={handleSummarize}
            loading={loading}
            disabled={!editor}
          >
            Summarize
          </Button>
        </Paper>
      </Stack>

      {/* Right Column - Output */}
      <Stack gap="sm" style={{ flex: 1, minHeight: 0, height: '100%' }}>
        <Paper p="md" radius="sm" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <SegmentedControl
            value={activeTab}
            onChange={(value) => setActiveTab(value as TabValue)}
            data={[
              { label: 'System Prompt', value: 'system' },
              { label: 'Assistant Prompt', value: 'assistant' },
              { label: 'User Prompt', value: 'user' },
              { label: 'Summary', value: 'summary' },
            ]}
            mb="sm"
          />
          <Group justify="space-between" mb="sm">
            <Text size="sm" c="dimmed">
              Character count: {content.length}
            </Text>
            <CopyButton value={content}>
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
          <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Code
              block
              p={15}
              bg="transparent"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}
            >
              {content}
            </Code>
          </Box>
        </Paper>
      </Stack>
    </Group>
  );
};
