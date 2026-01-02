// src/wizards/testUtils.ts
import type { WizardConfig, WizardStep, LlmProcessingStep } from './types';
import { hasTestPrompt } from './promptBuilder';

/**
 * Represents a testable LLM step with its path in the wizard
 */
export type TestableLlmStep = {
  step: LlmProcessingStep;
  stepPath: number[];
  label: string; // Human-readable label like "Step 2: Character Analysis"
};

/**
 * Recursively finds all LLM steps in a wizard that have test prompts
 */
export function findTestableLlmSteps(config: WizardConfig): TestableLlmStep[] {
  const results: TestableLlmStep[] = [];

  function traverse(steps: WizardStep[], parentPath: number[] = []) {
    steps.forEach((step, index) => {
      const stepPath = [...parentPath, index];

      if (step.type === 'llm-processing' && hasTestPrompt(step)) {
        // Create a readable label
        const stepNumber = index + 1;
        const label = `Step ${stepNumber}: ${step.title}`;

        results.push({
          step,
          stepPath,
          label,
        });
      } else if (step.type === 'compound') {
        // Recurse into compound steps
        traverse(step.subSteps, stepPath);
      }
    });
  }

  traverse(config.steps);
  return results;
}

/**
 * Checks if a wizard has any testable LLM steps
 */
export function hasTestableSteps(config: WizardConfig): boolean {
  return findTestableLlmSteps(config).length > 0;
}
