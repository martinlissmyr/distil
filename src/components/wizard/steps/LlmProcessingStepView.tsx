// src/components/wizard/steps/LlmProcessingStepView.tsx
import React from 'react';
import { Stack, Text, Loader, Alert, Paper, Title } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import type { LlmProcessingStep } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';

type LlmProcessingStepViewProps = {
  step: LlmProcessingStep;
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
      {/* Step header */}
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

      {/* Processing states */}
      {error ? (
        <Alert icon={<AlertCircle size={16} />} title="Error" color="red">
          <Text size="sm">{error}</Text>
        </Alert>
      ) : isProcessing ? (
        <Stack gap="md" align="center" style={{ minHeight: 200, justifyContent: 'center' }}>
          <Loader size="lg" />
          <Text size="sm" c="dimmed">
            Processing with AI...
          </Text>
        </Stack>
      ) : showResult ? (
        <>
          {/* Result display */}
          <Paper p="md" withBorder>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </Text>
          </Paper>

          {/* Approval buttons shown in bottom navigation when approvalOptions provided */}
          {!step.approvalOptions && (
            <Text size="xs" c="dimmed" ta="center">
              Click Next to continue
            </Text>
          )}
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
