// src/ui/playground/IsolatedLlmStepTester.tsx
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Paper,
  Text,
  Button,
  Loader,
  Alert,
  Code,
  Group,
  Box,
  SegmentedControl,
  CopyButton,
} from '@mantine/core';
import { AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import type { TestableLlmStep } from '../../wizards/testUtils';
import type { WizardContext } from '../../wizards/types';
import { buildPromptForStep } from '../../wizards/promptBuilder';
import { useAppStore } from '../../state/useAppStore';

type IsolatedLlmStepTesterProps = {
  testableStep: TestableLlmStep;
  wizardContext: WizardContext;
};

type ViewTab = 'system' | 'user' | 'result';

export const IsolatedLlmStepTester: React.FC<IsolatedLlmStepTesterProps> = ({
  testableStep,
  wizardContext,
}) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [llmResult, setLlmResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('system');

  const handleRunTest = async () => {
    setIsProcessing(true);
    setError(null);
    setSystemPrompt(null);
    setUserPrompt(null);
    setLlmResult(null);

    try {
      // Build prompts using test data
      const { messages } = await buildPromptForStep(
        testableStep.step,
        {}, // Empty answers (test file should have mock data)
        {}, // Empty LLM results
        wizardContext,
        {
          resolveMetaDocsMarkdown: async (ctx) => {
            // Load any required meta docs for interpolation
            const docs: Record<string, string | null> = {};
            const store = useAppStore.getState();

            // Load manifest (root-level)
            await store.ensureMetaDocsLoaded({ scope: 'root' }, ['manifest']);
            const manifestDoc = store.getMetaDoc({ scope: 'root' }, 'manifest');
            docs.manifest = manifestDoc?.markdown || null;

            // Load story-level docs if applicable
            if (ctx.ref.scope === 'story' && 'storyId' in ctx.ref) {
              const storyScope = {
                scope: 'story' as const,
                projectId: ctx.ref.projectId,
                storyId: ctx.ref.storyId,
              };

              await store.ensureMetaDocsLoaded(storyScope, ['brief', 'outline', 'world']);

              const briefDoc = store.getMetaDoc(storyScope, 'brief');
              const outlineDoc = store.getMetaDoc(storyScope, 'outline');
              const worldDoc = store.getMetaDoc(storyScope, 'world');

              docs.brief = briefDoc?.markdown || null;
              docs.outline = outlineDoc?.markdown || null;
              docs.world = worldDoc?.markdown || null;
            }

            return docs;
          },
          getWritingLanguage: () => useAppStore.getState().writingLanguage,
        },
        true // Use test prompt
      );

      // Extract system and user prompts
      const systemMsg = messages.find((m) => m.role === 'system');
      const userMsg = messages.find((m) => m.role === 'user');

      setSystemPrompt(systemMsg?.content || null);
      setUserPrompt(userMsg?.content || 'No user prompt');

      // Send to LLM via window.chat API
      const response = await (window as any).chat.send({ messages });
      if (!response.ok || !response.data?.output_text) {
        throw new Error(response.error || 'Chat failed');
      }

      setLlmResult(response.data.output_text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-run test on mount or when testableStep changes
  useEffect(() => {
    handleRunTest();
  }, [testableStep.step.id]);

  const renderContent = () => {
    if (activeTab === 'system') {
      return systemPrompt || 'No system prompt';
    } else if (activeTab === 'user') {
      return userPrompt || 'No user prompt';
    } else {
      return llmResult || 'No result yet';
    }
  };

  const currentContent = renderContent();

  return (
    <Stack gap="sm" style={{ height: '100%', minHeight: 0 }}>
      {/* Loading state */}
      {isProcessing && !llmResult && (
        <Box p="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">
              Running test...
            </Text>
          </Stack>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert icon={<AlertCircle size={16} />} title="Error" color="red" mx={10}>
          {error}
        </Alert>
      )}

      {/* Results with segmented control */}
      {!isProcessing && (systemPrompt || userPrompt || llmResult) && (
        <>
          <Box p={10}>
            <Paper radius="sm" p={10}>
              <Stack gap="sm">
                <SegmentedControl
                  value={activeTab}
                  onChange={(value) => setActiveTab(value as ViewTab)}
                  data={[
                    { label: 'System Prompt', value: 'system' },
                    { label: 'User Prompt', value: 'user' },
                    { label: 'LLM Result', value: 'result' },
                  ]}
                />
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Character count: {currentContent.length}
                  </Text>
                  <CopyButton value={currentContent}>
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

          <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }} px={10}>
            <Code
              block
              p={15}
              bg="transparent"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
              }}
            >
              {currentContent}
            </Code>
          </Box>
        </>
      )}
    </Stack>
  );
};
