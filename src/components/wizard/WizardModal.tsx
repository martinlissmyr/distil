// src/components/wizard/WizardModal.tsx
import React, { useEffect, useRef } from 'react';
import { Box, Stack, Text, Button, Group } from '@mantine/core';
import { Check } from 'lucide-react';
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
      title=""
      size="xl"
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered={false}
      styles={{
        inner: {
          paddingTop: 60,
          paddingBottom: 60,
        },
      }}
    >
      <Stack gap="lg">
        {/* Step indicator with fade overflow */}
        <Box
          style={{
            position: 'relative',
            overflow: 'hidden',
            paddingBottom: 8,
          }}
        >
          {/* Left fade gradient */}
          <Box
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 8,
              width: 60,
              background: 'linear-gradient(to right, var(--mantine-color-body) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Right fade gradient */}
          <Box
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 8,
              width: 60,
              background: 'linear-gradient(to left, var(--mantine-color-body) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Steps container */}
          <Group
            gap="xl"
            wrap="nowrap"
            style={{
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingLeft: 40,
              paddingRight: 40,
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
                <Group key={step.id} gap={6} wrap="nowrap" style={{ flex: '0 0 auto', opacity: isCompleted ? 0.5 : 1 }}>
                  {/* Circle with number or checkmark */}
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCompleted
                        ? 'var(--mantine-color-green-8)'
                        : isCurrent
                        ? 'white'
                        : 'var(--mantine-color-dark-5)',
                      color: isCompleted
                        ? 'white'
                        : isCurrent
                        ? 'var(--mantine-color-dark-9)'
                        : 'var(--mantine-color-dark-2)',
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? <Check size={16} /> : index + 1}
                  </Box>

                  {/* Step title */}
                  <Text
                    size="sm"
                    fw={isCurrent ? 600 : 400}
                    c={isFuture ? 'dimmed' : undefined}
                    style={{
                      whiteSpace: 'nowrap',
                      opacity: isFuture ? 0.5 : 1,
                      color: isCompleted ? 'var(--mantine-color-green-8)' : undefined,
                    }}
                  >
                    {step.title}
                  </Text>
                </Group>
              );
            })}
          </Group>

          {/* Hide scrollbar with CSS */}
          <style>{`
            .mantine-Group-root::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </Box>

        {/* Step content */}
        <Box p="xl" style={{ minHeight: 200 }}>
          {currentStep ? (
            <>
              {/* Render appropriate step component based on type */}
              {currentStep.type === 'question' && (
                <QuestionStepView step={currentStep as QuestionStep} />
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
            </>
          ) : (
            <Text c="dimmed">No step found</Text>
          )}
        </Box>

        {/* Navigation */}
        <Group justify={canGoBack ? "space-between" : "flex-end"}>
          {canGoBack && (
            <Button variant="subtle" onClick={handleBack}>
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
      </Stack>
    </Modal>
  );
};
