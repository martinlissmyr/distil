// src/components/wizard/steps/LlmApprovalStepView.tsx
import React from 'react';
import { Stack, Text, Paper, Group, Button, List, Code, Box, Title } from '@mantine/core';
import { Icon } from '../../common/Icon';
import type { LlmApprovalStep } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';

type LlmApprovalStepViewProps = {
  step: LlmApprovalStep;
};

export const LlmApprovalStepView: React.FC<LlmApprovalStepViewProps> = ({ step }) => {
  const activeWizard = useAppStore((s) => s.activeWizard);
  const { setAnswer, nextStep, previousStep, clearLlmResult } = useAppStore();

  // Get the LLM result from the specified source key
  const result = activeWizard?.llmResults[step.sourceKey];

  // Check if user has already approved this step
  const approval = activeWizard?.answers[step.id];

  const handleApprove = async () => {
    setAnswer(step.id, 'approved');
    await nextStep();
  };

  const handleReject = async () => {
    setAnswer(step.id, 'rejected');

    // Handle rejection based on onReject setting
    if (step.onReject === 'retry-previous') {
      // Clear the LLM result so it regenerates when we go back
      clearLlmResult(step.sourceKey);
      // Go back to the previous step (likely the LLM processing step)
      previousStep();
    } else if (step.onReject === 'skip') {
      // Skip to next step
      await nextStep();
    }
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality in a future phase
    // This would open a text editor to modify the result
    console.log('[LlmApprovalStepView] Edit not yet implemented');
  };

  // Render result based on display format
  const renderResult = () => {
    if (!result) {
      return (
        <Text size="sm" c="dimmed">
          No result available
        </Text>
      );
    }

    switch (step.displayFormat) {
      case 'text':
        return (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {String(result)}
          </Text>
        );

      case 'list':
        if (Array.isArray(result)) {
          return (
            <List size="sm">
              {result.map((item, index) => (
                <List.Item key={index}>{String(item)}</List.Item>
              ))}
            </List>
          );
        }
        return (
          <Text size="sm" c="dimmed">
            Expected an array but got: {typeof result}
          </Text>
        );

      case 'json':
        return (
          <Code block style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </Code>
        );

      default:
        return (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </Text>
        );
    }
  };

  const approveLabel = step.approvalOptions?.approveLabel ?? 'Approve';
  const rejectLabel = step.approvalOptions?.rejectLabel ?? 'Reject';
  const editLabel = step.approvalOptions?.editLabel ?? 'Edit';

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

      {/* Result display */}
      <Paper p="md" withBorder>
        <Box style={{ maxHeight: 400, overflow: 'auto' }}>
          {renderResult()}
        </Box>
      </Paper>

      {/* Approval status */}
      {approval && (
        <Text size="sm" c={approval === 'approved' ? 'green' : 'orange'}>
          Status: {approval}
        </Text>
      )}

      {/* Action buttons */}
      <Group justify="flex-end" gap="xs">
        {step.approvalOptions?.editLabel && (
          <Button
            variant="subtle"
            leftSection={<Icon type="edit" size={16} />}
            onClick={handleEdit}
          >
            {editLabel}
          </Button>
        )}
        <Button
          variant="default"
          leftSection={<Icon type="close" size={16} />}
          onClick={handleReject}
          color="red"
        >
          {rejectLabel}
        </Button>
        <Button
          leftSection={<Icon type="check" size={16} />}
          onClick={handleApprove}
          color="green"
        >
          {approveLabel}
        </Button>
      </Group>
    </Stack>
  );
};
