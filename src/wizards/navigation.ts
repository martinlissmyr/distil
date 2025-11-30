// src/wizards/navigation.ts
import type { WizardConfig, WizardStep, CompoundStep, ConditionExpression } from './types';

/**
 * Get the current step from a wizard config given the current step path
 */
export function getCurrentStep(
  config: WizardConfig,
  stepPath: number[]
): WizardStep | null {
  if (stepPath.length === 0) return null;

  let steps = config.steps;
  let currentStep: WizardStep | null = null;

  for (let i = 0; i < stepPath.length; i++) {
    const index = stepPath[i];
    if (index < 0 || index >= steps.length) return null;

    currentStep = steps[index];

    // If not the last index, navigate into sub-steps
    if (i < stepPath.length - 1) {
      if (currentStep.type !== 'compound') return null;
      steps = currentStep.subSteps;
    }
  }

  return currentStep;
}

/**
 * Check if a step should be skipped based on its skipIf condition
 */
export function shouldSkipStep(
  step: WizardStep,
  answers: Record<string, any>
): boolean {
  if (!step.skipIf) return false;
  return evaluateCondition(step.skipIf, answers);
}

/**
 * Evaluate a conditional expression
 */
function evaluateCondition(
  condition: ConditionExpression,
  answers: Record<string, any>
): boolean {
  switch (condition.type) {
    case 'isEmpty':
      return !answers[condition.stepId];
    case 'equals':
      return answers[condition.stepId] === condition.value;
    case 'contains':
      return answers[condition.stepId]?.includes(condition.value) ?? false;
    case 'and':
      return condition.conditions.every((c) => evaluateCondition(c, answers));
    case 'or':
      return condition.conditions.some((c) => evaluateCondition(c, answers));
    default:
      return false;
  }
}

/**
 * Check if the current step is the last step in the wizard
 */
export function isLastStep(config: WizardConfig, stepPath: number[]): boolean {
  if (stepPath.length === 0) return false;

  // Get parent context
  const parentPath = stepPath.slice(0, -1);
  const steps = parentPath.length === 0
    ? config.steps
    : (getCurrentStep(config, parentPath) as CompoundStep)?.subSteps || [];

  const currentIndex = stepPath[stepPath.length - 1];

  // Check if this is the last step in current context
  if (currentIndex < steps.length - 1) return false;

  // If we're in a compound step, we're not done yet
  if (parentPath.length > 0) return false;

  return true;
}

/**
 * Get the next step path, handling nested steps
 */
export function getNextStepPath(
  config: WizardConfig,
  currentPath: number[],
  answers: Record<string, any>
): number[] | null {
  if (currentPath.length === 0) return [0];

  const currentStep = getCurrentStep(config, currentPath);
  if (!currentStep) return null;

  // If current step is a compound step, enter its first sub-step
  if (currentStep.type === 'compound' && currentStep.subSteps.length > 0) {
    let nextPath = [...currentPath, 0];
    const nextStep = getCurrentStep(config, nextPath);

    // Skip if necessary
    if (nextStep && shouldSkipStep(nextStep, answers)) {
      return getNextStepPath(config, nextPath, answers);
    }

    return nextPath;
  }

  // Try to advance within current level
  const parentPath = currentPath.slice(0, -1);
  const currentIndex = currentPath[currentPath.length - 1];

  const steps = parentPath.length === 0
    ? config.steps
    : (getCurrentStep(config, parentPath) as CompoundStep)?.subSteps || [];

  if (currentIndex + 1 < steps.length) {
    // Next sibling exists
    let nextPath = [...parentPath, currentIndex + 1];
    const nextStep = getCurrentStep(config, nextPath);

    // Skip if necessary
    if (nextStep && shouldSkipStep(nextStep, answers)) {
      return getNextStepPath(config, nextPath, answers);
    }

    return nextPath;
  }

  // No more siblings, go up a level
  if (parentPath.length > 0) {
    return getNextStepPath(config, parentPath, answers);
  }

  // Reached the end
  return null;
}

/**
 * Get the previous step path
 */
export function getPreviousStepPath(
  config: WizardConfig,
  currentPath: number[]
): number[] | null {
  if (currentPath.length === 0) return null;

  const currentIndex = currentPath[currentPath.length - 1];

  // If we can go back at current level
  if (currentIndex > 0) {
    const parentPath = currentPath.slice(0, -1);
    let prevPath = [...parentPath, currentIndex - 1];
    const prevStep = getCurrentStep(config, prevPath);

    // If previous step is compound, navigate to its last descendant
    if (prevStep?.type === 'compound') {
      return getLastDescendantPath(config, prevPath);
    }

    return prevPath;
  }

  // Go up a level
  if (currentPath.length > 1) {
    return currentPath.slice(0, -1);
  }

  // Can't go back further
  return null;
}

/**
 * Get the last descendant path of a step (for compound steps)
 */
function getLastDescendantPath(
  config: WizardConfig,
  stepPath: number[]
): number[] {
  const step = getCurrentStep(config, stepPath);
  if (!step || step.type !== 'compound' || step.subSteps.length === 0) {
    return stepPath;
  }

  const lastSubStepIndex = step.subSteps.length - 1;
  const lastSubStepPath = [...stepPath, lastSubStepIndex];
  const lastSubStep = getCurrentStep(config, lastSubStepPath);

  if (lastSubStep?.type === 'compound') {
    return getLastDescendantPath(config, lastSubStepPath);
  }

  return lastSubStepPath;
}

/**
 * Check if a step is complete (has valid answer)
 */
export function isStepComplete(
  step: WizardStep,
  answers: Record<string, any>
): boolean {
  if (step.type === 'llm-processing' || step.type === 'llm-approval') {
    // LLM steps are considered complete when they have a result
    return true; // Will be validated elsewhere
  }

  if (step.type === 'compound') {
    // Compound steps are complete when all sub-steps are complete
    return step.subSteps.every((subStep) => isStepComplete(subStep, answers));
  }

  // Question step
  const answer = answers[step.id];

  if (step.required && !answer) {
    return false;
  }

  if (step.questionType === 'textarea' || step.questionType === 'text') {
    if (step.minLength && typeof answer === 'string' && answer.length < step.minLength) {
      return false;
    }
    if (step.maxLength && typeof answer === 'string' && answer.length > step.maxLength) {
      return false;
    }
  }

  if (step.questionType === 'multi-select') {
    if (!Array.isArray(answer)) return false;
    if (step.minSelections && answer.length < step.minSelections) return false;
    if (step.maxSelections && answer.length > step.maxSelections) return false;
  }

  return true;
}
