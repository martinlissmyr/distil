// src/ui/wizard/steps/LlmProcessingStepView.tsx
import React from 'react';
import {
  Stack,
  Text,
  Loader,
  Alert,
  Paper,
  Title,
  Textarea,
} from '@mantine/core';
import { Icon } from '../../common/Icon';
import type { LlmProcessingStep } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';
import { MarkdownContent } from '../../common/MarkdownContent';

type LlmProcessingStepViewProps = {
  step: LlmProcessingStep;
};

const toEditableString = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const LlmProcessingStepView: React.FC<LlmProcessingStepViewProps> = ({ step }) => {
  const activeWizard = useAppStore((s) => s.activeWizard);
  const { setLlmDraft } = useAppStore();

  const isProcessing = activeWizard?.isLlmProcessing ?? false;
  const error = activeWizard?.error;

  const rawResult = activeWizard?.llmResults?.[step.resultKey];
  const hasResult = rawResult !== undefined;
  const showResult = !isProcessing && !error && hasResult && !step.hidden;

  const draft = activeWizard?.llmDrafts?.[step.resultKey] ?? toEditableString(rawResult);

  return (
    <Stack gap="md">
      {error ? (
        <Alert icon={<Icon type="validationError" size={16} />} title="Error" color="red">
          <Text size="sm">{error}</Text>
        </Alert>
      ) : isProcessing ? (
        <Stack gap="md" align="center" style={{ minHeight: 200, justifyContent: 'center' }}>
          <Loader size="xl" />
          <Text size="sm" c="dimmed">Processing...</Text>
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

          {step.editableResult ? (
            <Textarea
              value={draft}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setLlmDraft(step.resultKey, v);
              }}
              radius={8}
              autosize
              minRows={10}
            />
          ) : (
            <Paper p="md" radius="sm" withBorder>
              <MarkdownContent content={toEditableString(rawResult)} />
            </Paper>
          )}
        </>
      ) : (
        <Stack gap="md" align="center" style={{ minHeight: 200, justifyContent: 'center' }}>
          <Text size="sm" c="dimmed">Processing complete!</Text>
        </Stack>
      )}
    </Stack>
  );
};
