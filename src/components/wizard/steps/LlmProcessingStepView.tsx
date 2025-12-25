// src/components/wizard/steps/LlmProcessingStepView.tsx
import React from 'react';
import { Stack, Text, Loader, Alert, Paper, Title } from '@mantine/core';
import { Icon } from '../../common/Icon';
import type { LlmProcessingStep } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';
import { MarkdownContent } from '../../common/MarkdownContent';

type LlmProcessingStepViewProps = {
  step: LlmProcessingStep;
};

const RenderedResult: React.FC<{ content: unknown }> = ({ content }) => {
  if (typeof content === 'string') return <MarkdownContent content={content} />;
  return <MarkdownContent content={JSON.stringify(content, null, 2)} />;
};

export const LlmProcessingStepView: React.FC<LlmProcessingStepViewProps> = ({ step }) => {
  const activeWizard = useAppStore((s) => s.activeWizard);
  const isProcessing = activeWizard?.isLlmProcessing ?? false;
  const error = activeWizard?.error;
  const result = activeWizard?.llmResults[step.resultKey];

  // If processing is complete and step is not hidden, show the result
  const showResult = !isProcessing && !error && result !== undefined && !step.hidden;

  return (
    <Stack gap="md">
       {/* Processing states */}
      {error ? (
        <Alert icon={<Icon type="error" size={16} />} title="Error" color="red">
          <Text size="sm">{error}</Text>
        </Alert>
      ) : isProcessing ? (
        <Stack gap="md" align="center" style={{ minHeight: 200, justifyContent: 'center' }}>
          <Loader size="xl" />
          <Text size="sm" c="dimmed">
            Processing...
          </Text>
        </Stack>
      ) : showResult ? (
        <>
          <Stack gap="20" mb="2">
            <Title order={1} size="h2" fw={600}>
              {step.title}
            </Title>
            {step.description && (
              <Text size="sm" c="dimmed">
                {step.description}
              </Text>
            )}
          </Stack>
          <Paper p="md" radius="sm" withBorder>
            <RenderedResult content={result} />
          </Paper>
        </>
      ) : (
        <Stack gap="md" align="center" style={{ minHeight: 200, justifyContent: 'center' }}>
          <Text size="sm" c="dimmed">
            Processing complete!
          </Text>
        </Stack>
      )}
    </Stack>
  );
};
