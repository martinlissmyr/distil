// src/components/wizard/WizardModal.tsx
import React, { useEffect, useRef } from 'react';
import { Box, Stack, Text, Button, Group, ActionIcon, ScrollArea } from '@mantine/core';
import { Icon } from '../common/Icon';
import { Modal } from '../common/Modal';
import { useAppStore } from '../../state/useAppStore';
import { getCurrentStep } from '../../wizards/navigation';
import { QuestionStepView } from './steps/QuestionStepView';
import { LlmProcessingStepView } from './steps/LlmProcessingStepView';
import { LlmApprovalStepView } from './steps/LlmApprovalStepView';
import type { QuestionStep, LlmProcessingStep, LlmApprovalStep } from '../../wizards/types';

type WizardModalProps = {
  opened: boolean;
  onClose: () => void;
};

export const WizardModal: React.FC<WizardModalProps> = ({ opened, onClose }) => {
  const activeWizard = useAppStore((s) => s.activeWizard);
  const { nextStep, previousStep, closeWizard, getAnswer, processLlmStep, setAnswer, clearLlmResult } = useAppStore();

  // Track which steps we've already initiated processing for
  const processingInitiatedRef = useRef<Set<string>>(new Set());

  // Get current step (safe to call even if activeWizard is null)
  const currentStep = activeWizard ? getCurrentStep(
    activeWizard.config,
    activeWizard.currentStepPath
  ) : null;

  // Auto-trigger LLM processing when arriving at an LLM step
  useEffect(() => {
    if (!activeWizard || !opened || !currentStep || currentStep.type !== 'llm-processing') return;

    const processingStep = currentStep as LlmProcessingStep;
    const hasResult = !!activeWizard.llmResults[processingStep.resultKey];
    const isProcessing = activeWizard.isLlmProcessing;
    const alreadyInitiated = processingInitiatedRef.current.has(processingStep.id);

    console.log('[WizardModal] useEffect - LLM step detected:', {
      stepId: processingStep.id,
      resultKey: processingStep.resultKey,
      hasResult,
      isProcessing,
      alreadyInitiated,
    });

    // If result was cleared (rejection), allow re-initiation
    if (!hasResult && alreadyInitiated) {
      console.log('[WizardModal] Result was cleared, removing from initiated set');
      processingInitiatedRef.current.delete(processingStep.id);
    }

    // Only trigger if we don't have a result yet, we're not already processing, and we haven't initiated yet
    if (!hasResult && !isProcessing && !processingInitiatedRef.current.has(processingStep.id)) {
      console.log('[WizardModal] Auto-triggering LLM processing');
      processingInitiatedRef.current.add(processingStep.id);
      processLlmStep(processingStep);
    }
  }, [currentStep?.id, activeWizard?.isLlmProcessing, activeWizard?.llmResults, opened]);

  if (!activeWizard || !opened) return null;
  if (!currentStep) return null;

  const handleClose = () => {
    const confirmed = closeWizard(false);
    if (confirmed) {
      onClose();
    }
  };

  const handleNext = async () => {
    await nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  // Handlers for approval steps
  const handleApprove = async () => {
    if (!currentStep) return;

    if (currentStep.type === 'llm-processing') {
      const processingStep = currentStep as LlmProcessingStep;
      setAnswer(processingStep.id, 'approved');
      await nextStep();
    } else if (currentStep.type === 'llm-approval') {
      const approvalStep = currentStep as LlmApprovalStep;
      setAnswer(approvalStep.id, 'approved');
      await nextStep();
    }
  };

  const handleReject = () => {
    if (!currentStep) return;

    if (currentStep.type === 'llm-processing') {
      const processingStep = currentStep as LlmProcessingStep;
      setAnswer(processingStep.id, 'rejected');
      clearLlmResult(processingStep.resultKey);
    } else if (currentStep.type === 'llm-approval') {
      const approvalStep = currentStep as LlmApprovalStep;
      setAnswer(approvalStep.id, 'rejected');

      if (approvalStep.onReject === 'retry-previous') {
        clearLlmResult(approvalStep.sourceKey);
        previousStep();
      } else if (approvalStep.onReject === 'skip') {
        nextStep();
      }
    }
  };

  // Calculate step info
  const currentStepIndex = activeWizard.currentStepPath[0];
  const totalSteps = activeWizard.config.steps.length;

  // Check if we can go back
  const canGoBack = currentStepIndex > 0;

  // Check if we're on the last step
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Check if current step uses approval buttons (hide standard Next button)
  const usesApprovalButtons = (() => {
    if (!currentStep) return false;

    if (currentStep.type === 'llm-processing') {
      return !!(currentStep as LlmProcessingStep).approvalOptions;
    }

    if (currentStep.type === 'llm-approval') {
      return true;
    }

    return false;
  })();

  // Check if approval buttons should be disabled
  const approvalButtonsDisabled = (() => {
    if (!currentStep) return true;

    // Always disable if currently processing
    if (activeWizard.isLlmProcessing) return true;

    // For llm-processing steps, disable if no result yet
    if (currentStep.type === 'llm-processing') {
      const processingStep = currentStep as LlmProcessingStep;
      return !activeWizard.llmResults[processingStep.resultKey];
    }

    // For llm-approval steps, disable if no result in source
    if (currentStep.type === 'llm-approval') {
      const approvalStep = currentStep as LlmApprovalStep;
      return !activeWizard.llmResults[approvalStep.sourceKey];
    }

    return false;
  })();

  // Validate if Next button should be enabled
  const canGoNext = (() => {
    if (!currentStep) return false;

    // For question steps, validate the answer
    if (currentStep.type === 'question') {
      const questionStep = currentStep as QuestionStep;
      const answer = getAnswer(questionStep.id);

      // Text/Textarea validation
      if (questionStep.questionType === 'text' || questionStep.questionType === 'textarea') {
        // Check required
        if (questionStep.required && !String(answer || '').trim()) {
          return false;
        }

        // Check minLength
        if (questionStep.minLength) {
          const answerStr = String(answer || '').trim();
          if (answerStr.length < questionStep.minLength) {
            return false;
          }
        }

        // Check maxLength
        if (questionStep.maxLength) {
          const answerStr = String(answer || '');
          if (answerStr.length > questionStep.maxLength) {
            return false;
          }
        }
      }

      // Scale validation (scales are always valid once set)
      // Scale questions will have a default value, so they're always valid

      // Single-select validation
      if (questionStep.questionType === 'single-select') {
        if (questionStep.required && !answer) {
          return false;
        }
      }

      // Multi-select validation
      if (questionStep.questionType === 'multi-select') {
        const selectedValues = Array.isArray(answer) ? answer : [];

        // Check required
        if (questionStep.required && selectedValues.length === 0) {
          return false;
        }

        // Check minSelections
        if (questionStep.minSelections && selectedValues.length < questionStep.minSelections) {
          return false;
        }

        // Check maxSelections
        if (questionStep.maxSelections && selectedValues.length > questionStep.maxSelections) {
          return false;
        }
      }
    }

    // For LLM processing steps
    if (currentStep.type === 'llm-processing') {
      const processingStep = currentStep as LlmProcessingStep;

      // Debug logging
      console.log('[WizardModal] LLM Processing validation:', {
        isProcessing: activeWizard.isLlmProcessing,
        hidden: processingStep.hidden,
        resultKey: processingStep.resultKey,
        result: activeWizard.llmResults[processingStep.resultKey],
        hasResult: !!activeWizard.llmResults[processingStep.resultKey],
        hasApprovalOptions: !!processingStep.approvalOptions,
      });

      // Disable Next if currently processing
      if (activeWizard.isLlmProcessing) {
        return false;
      }

      // If has approval options, disable Next (uses its own approve/reject buttons)
      if (processingStep.approvalOptions) {
        return false;
      }

      // Enable Next once processing is complete (unless hidden, which auto-advances)
      if (!processingStep.hidden) {
        // Check if result exists
        return !!activeWizard.llmResults[processingStep.resultKey];
      }
      // Hidden steps auto-advance, so Next button doesn't matter
      return false;
    }

    // For LLM approval steps
    if (currentStep.type === 'llm-approval') {
      // Approval steps handle their own navigation via approve/reject buttons
      // So we disable the standard Next button
      return false;
    }

    return true;
  })();

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="90%"
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered={false}
      withCloseButton={false}
      padding="0"
      styles={{
        content: {
          height: '90vh',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        },
      }}
    >
        {/* Top Shader */}
        <Box
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            height: 100,
            background: 'linear-gradient(to bottom, var(--mantine-color-body) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Top header */}
        <Box
          pt="30px"
          pl="0"
          pr="70px"
          mb="20px"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            overflow: 'hidden',
            zIndex: 100
          }}
        >
          <Box
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 50,
              background: 'linear-gradient(to right, var(--mantine-color-body) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          <ActionIcon
            aria-label="Close"
            variant="subtle"
            color="var(--text)"
            onClick={handleClose}
            style={{
              position: 'absolute',
              right: 30,
              top: 37,
              zIndex: 1,
            }}
          >
            <Icon type="close" />
          </ActionIcon>

          <Box
            style={{
              position: 'absolute',
              right: 70,
              top: 0,
              bottom: 0,
              width: 70,
              background: 'linear-gradient(to left, var(--mantine-color-body) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          <Group
            wrap="nowrap"
            gap="10"
            pl="30"
            pr="60"
            style={{
              overflow: 'hidden',
            }}
            ref={(node) => {
              if (node) {
                // Scroll current step into view
                const currentStepElement = node.children[currentStepIndex] as HTMLElement;
                if (currentStepElement) {
                  currentStepElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                  });
                }
              }
            }}
          >
            {activeWizard.config.steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <Group
                  key={step.id}
                  pl="4"
                  pr="14"
                  py="4"
                  gap={6}
                  wrap="nowrap"
                  style={{
                    borderRadius: 20,
                    flex: '0 0 auto',
                    backgroundColor: isCompleted
                      ? 'var(--mantine-color-dark-8)'
                      : isCurrent
                      ? 'var(--mantine-color-dark-4)'
                      : 'var(--mantine-color-dark-8)',
                    color: isCompleted
                      ? 'rgba(0,0,0,.3)'
                      : isCurrent
                      ? 'white'
                      : 'var(--mantine-color-dark-2)',
                  }}>
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                      backgroundColor: isCompleted
                        ? 'rgba(0,0,0,.05)'
                        : isCurrent
                        ? 'rgba(255,255,255,.15)'
                        : 'rgba(255,255,255,.05)',
                      color: isCompleted
                        ? 'rgba(0,0,0,.3)'
                        : isCurrent
                        ? 'white'
                        : 'var(--mantine-color-dark-2)',
                    }}
                  >
                    {isCompleted ? <Icon type="check" size={16} /> : index + 1}
                  </Box>

                  <Text
                    size="sm"
                    fw={isCurrent ? 600 : 400}
                    c={isFuture ? 'dimmed' : undefined}
                    style={{
                      whiteSpace: 'nowrap',
                      opacity: isFuture ? 0.5 : 1,
                      color: isCompleted ? 'var(--mantine-color-green-10)' : undefined,
                    }}
                  >
                    {step.title}
                  </Text>
                </Group>
              );
            })}
          </Group>
        </Box>

        {/* Middle: ScrollArea should take remaining space */}
        <ScrollArea
          pb="20"
          px="30"
          style={{ flex: 1, minHeight: 0 }}
        >
          {currentStep ? (
            <Box pt="150">
              {currentStep.type === 'question' && (
                <QuestionStepView key={currentStep.id} step={currentStep as QuestionStep} />
              )}

              {currentStep.type === 'llm-processing' && (
                <LlmProcessingStepView step={currentStep as LlmProcessingStep} />
              )}

              {currentStep.type === 'llm-approval' && (
                <LlmApprovalStepView step={currentStep as LlmApprovalStep} />
              )}

              {currentStep.type === 'compound' && (
                <Stack gap="md">
                  <Text size="xl" fw={600}>
                    {currentStep.title}
                  </Text>
                  {currentStep.description && (
                    <Text size="sm" c="dimmed">
                      {currentStep.description}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed">
                    TODO: Implement compound step rendering
                  </Text>
                </Stack>
              )}
            </Box>
          ) : (
            <Text c="dimmed">No step found</Text>
          )}
        </ScrollArea>

        {/* Bottom buttons */}
        <Group
          justify={canGoBack ? 'space-between' : 'flex-end'}
          mx="30"
          mb="20"
          style={{
            flex: '0 0 auto'
          }}
        >
          {canGoBack && (
            <Button variant="light" onClick={handleBack}>
              Back
            </Button>
          )}
          {!usesApprovalButtons ? (
            <Button onClick={handleNext} disabled={!canGoNext}>
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          ) : (
            <Group gap="sm">
              <Button variant="default" onClick={handleReject} disabled={approvalButtonsDisabled}>
                {(() => {
                  if (currentStep?.type === 'llm-processing') {
                    return (currentStep as LlmProcessingStep).approvalOptions?.rejectLabel ?? 'Regenerate';
                  } else if (currentStep?.type === 'llm-approval') {
                    return (currentStep as LlmApprovalStep).approvalOptions?.rejectLabel ?? 'Reject';
                  }
                  return 'Reject';
                })()}
              </Button>
              <Button onClick={handleApprove} disabled={approvalButtonsDisabled}>
                {isLastStep ? 'Finish' : 'Next'}
              </Button>
            </Group>
          )}
        </Group>
    </Modal>
  );
};
