// src/ui/wizard/WizardModal.tsx
import React, { useEffect, useRef } from 'react';
import { Box, Stack, Text, Button, Group, ActionIcon, ScrollArea } from '@mantine/core';
import { Icon } from '../common/Icon';
import { BaseModal } from '../common/BaseModal';
import { useAppStore } from '../../state/useAppStore';
import { getCurrentStep } from '../../wizards/navigation';
import { QuestionStepView } from './steps/QuestionStepView';
import { InformationStepView } from './steps/InformationStepView';
import { LlmProcessingStepView } from './steps/LlmProcessingStepView';
import { LlmApprovalStepView } from './steps/LlmApprovalStepView';
import type { QuestionStep, LlmProcessingStep, LlmApprovalStep, InformationStep } from '../../wizards/types';
import { TopNavigation } from '../common/TopNavigation';

type WizardModalProps = {
  opened: boolean;
  onClose: () => void;
};

export const WizardModal: React.FC<WizardModalProps> = ({ opened, onClose }) => {
  const activeWizard = useAppStore((s) => s.activeWizard);
  const {
    nextStep,
    previousStep,
    closeWizard,
    getAnswer,
    processLlmStep,
    setLlmResult,
    setAnswer,
    clearLlmResult
  } = useAppStore();

  // Track which steps we've already initiated processing for
  const processingInitiatedRef = useRef<Set<string>>(new Set());

  // Get current step (safe to call even if activeWizard is null)
  const currentStep = activeWizard ? getCurrentStep(
    activeWizard.config,
    activeWizard.currentStepPath
  ) : null;

  // Select specific properties to avoid re-triggering on unrelated state changes
  const isLlmProcessing = useAppStore((s) => s.activeWizard?.isLlmProcessing ?? false);
  const currentStepId = currentStep?.id;
  const llmResultForCurrentStep = useAppStore((s) => {
    if (!currentStep || currentStep.type !== 'llm-processing') return undefined;
    const step = currentStep as LlmProcessingStep;
    return s.activeWizard?.llmResults?.[step.resultKey];
  });

  // Auto-trigger LLM processing when arriving at an LLM step
  useEffect(() => {
    if (!activeWizard || !opened || !currentStep || currentStep.type !== 'llm-processing') return;

    const processingStep = currentStep as LlmProcessingStep;

    const hasResult = llmResultForCurrentStep !== undefined; // IMPORTANT: presence, not truthiness
    const alreadyInitiated = processingInitiatedRef.current.has(processingStep.id);

    console.log('[WizardModal] useEffect - LLM step detected:', {
      stepId: processingStep.id,
      resultKey: processingStep.resultKey,
      hasResult,
      isProcessing: isLlmProcessing,
      alreadyInitiated,
      resultType: typeof llmResultForCurrentStep,
    });

    // If result was cleared (rejection), allow re-initiation
    if (!hasResult && alreadyInitiated) {
      console.log('[WizardModal] Result was cleared, removing from initiated set');
      processingInitiatedRef.current.delete(processingStep.id);
    }

    // Only trigger if we don't have a result yet, we're not already processing, and we haven't initiated yet
    if (!hasResult && !isLlmProcessing && !processingInitiatedRef.current.has(processingStep.id)) {
      console.log('[WizardModal] Auto-triggering LLM processing');
      processingInitiatedRef.current.add(processingStep.id);
      processLlmStep(processingStep);
    }
  }, [
    opened,
    currentStepId,
    isLlmProcessing,
    llmResultForCurrentStep,
    processLlmStep,
    activeWizard, // Still need this for the guard checks
    currentStep, // Still need this for the guard checks
  ]);

  // Auto-advance hidden LLM steps when processing completes
  useEffect(() => {
    if (!activeWizard || !opened || !currentStep || currentStep.type !== 'llm-processing') return;

    const processingStep = currentStep as LlmProcessingStep;

    // Only auto-advance hidden steps
    if (!processingStep.hidden) return;

    const hasResult = llmResultForCurrentStep !== undefined;

    // If hidden step has result and not currently processing, advance
    if (hasResult && !isLlmProcessing) {
      console.log('[WizardModal] Auto-advancing hidden step:', processingStep.id);
      nextStep();
    }
  }, [
    opened,
    currentStepId,
    isLlmProcessing,
    llmResultForCurrentStep,
    nextStep,
    activeWizard,
    currentStep,
  ]);

  if (!activeWizard || !opened) return null;
  if (!currentStep) return null;

  const handleClose = () => {
    const confirmed = closeWizard(false);
    if (confirmed) {
      onClose();
    }
  };

  const handleNext = async () => {
    // ✅ If current step is editable LLM, commit draft -> resultKey right before Next
    if (activeWizard && currentStep?.type === 'llm-processing') {
      const s = currentStep as LlmProcessingStep;
      if (s.editableResult) {
        const draft = activeWizard.llmDrafts?.[s.resultKey];
        if (draft !== undefined) {
          setLlmResult(s.resultKey, draft);
        }
      }
    }

    await nextStep();
  };

  const handleBack = () => {
    previousStep();
  };

  // Handlers for approval steps
  const handleApprove = async () => {
    if (!currentStep || !activeWizard) return;

    if (currentStep.type === 'llm-processing') {
      const processingStep = currentStep as LlmProcessingStep;

      // ✅ also commit on approve
      if (processingStep.editableResult) {
        const draft = activeWizard.llmDrafts?.[processingStep.resultKey];
        if (draft !== undefined) {
          setLlmResult(processingStep.resultKey, draft);
        }
      }

      setAnswer(processingStep.id, 'approved');
      await nextStep();
    }
  };

  const handleReject = () => {
    if (!currentStep) return;

    if (currentStep.type === 'llm-processing') {
      const processingStep = currentStep as LlmProcessingStep;
      setAnswer(processingStep.id, 'rejected');
      clearLlmResult(processingStep.resultKey);
    }
  };

  // Calculate step info
  const currentStepIndex = activeWizard.currentStepPath[0];

  // Calculate visible (non-hidden) step counts
  const visibleSteps = activeWizard.config.steps.filter(step => {
    if (step.type === 'llm-processing') {
      return !(step as LlmProcessingStep).hidden;
    }
    if (step.type === 'information') {
      return false;
    }
    return true;
  });
  const totalVisibleSteps = visibleSteps.length;

  // Calculate current visible step index (how many non-hidden steps have we passed)
  const currentVisibleStepIndex = activeWizard.config.steps
    .slice(0, currentStepIndex)
    .filter(step => {
      if (step.type === 'llm-processing') {
        return !(step as LlmProcessingStep).hidden;
      }
      if (step.type === 'information') {
        return false;
      }
      return true;
    }).length + 1; // +1 because we want 1-based indexing

  const stepTitle = currentStep.title ?? activeWizard.config.steps[currentStepIndex]?.title ?? 'Step';
  const hideCounter = (currentStep.type === 'llm-processing' && (currentStep as LlmProcessingStep).hidden) || currentStep.type === 'information';

  const topTitle = hideCounter
    ? stepTitle
    : `${stepTitle} (${currentVisibleStepIndex}/${totalVisibleSteps})`;

  // Check if we can go back
  const canGoBack = currentStepIndex > 0;

  // Check if we're on the last step (based on actual step count, not visible count)
  const totalSteps = activeWizard.config.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Check if current step uses approval buttons (hide standard Next button)
  const usesApprovalButtons = (() => {
    if (!currentStep) return false;

    if (currentStep.type === 'llm-processing') {
      return !!(currentStep as LlmProcessingStep).approvalOptions;
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
      return activeWizard.llmResults[processingStep.resultKey] === undefined;
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
        hasResult: activeWizard.llmResults[processingStep.resultKey] !== undefined,
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
        return activeWizard.llmResults[processingStep.resultKey] !== undefined;
      }
      // Hidden steps auto-advance, so Next button doesn't matter
      return false;
    }

    return true;
  })();

  const Header = () => {
    return (
      <Box
        px={20}
        py={20}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <TopNavigation
          title={topTitle}
          onBack={canGoBack ? handleBack : undefined}
          onClose={handleClose}
        />
      </Box>
    );
  }

  const Footer = () => {
    return (
      <Group
        justify={'flex-end'}
        mx="20"
        mb="20"
        style={{
          flex: '0 0 auto'
        }}
      >
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
    );
  }

  return (
    <BaseModal
      opened={opened}
      onClose={handleClose}
      variant="sheet"
      overlayPreset="glassLight"
      header={<Header/>}
      footer={<Footer/>}
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

        {/* Bottom Shader */}
        <Box
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            right: 0,
            height: 150,
            background: 'linear-gradient(to top, var(--mantine-color-body) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Middle: ScrollArea should take remaining space */}
        <ScrollArea
          pb="20"
          style={{ flex: 1, minHeight: 0 }}
        >
          {currentStep ? (
            <Box pt={50} px={30}>
              {currentStep.type === 'information' && (
                <InformationStepView key={currentStep.id} step={currentStep as InformationStep} />
              )}

              {currentStep.type === 'question' && (
                <QuestionStepView key={currentStep.id} step={currentStep as QuestionStep} />
              )}

              {currentStep.type === 'llm-processing' && (
                <LlmProcessingStepView step={currentStep as LlmProcessingStep} />
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
    </BaseModal>
  );
};
