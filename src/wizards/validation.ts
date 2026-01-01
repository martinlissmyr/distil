// src/wizards/validation.ts
import type { WizardConfig, WizardStep, BaseStep } from './types';

/**
 * Validates a wizard configuration
 * Throws descriptive errors if invalid
 */

export function validateWizardConfigs(raw: any[]): WizardConfig[] {
  return raw.map(validateWizardConfig);
}

export function validateWizardConfig(data: any): WizardConfig {
  if (!data || typeof data !== 'object') {
    throw new Error('Wizard config must be an object');
  }

  if (typeof data.id !== 'string' || !data.id) {
    throw new Error('Wizard config must have an id (string)');
  }

  if (typeof data.version !== 'string' || !data.version) {
    throw new Error('Wizard config must have a version (string)');
  }

  if (typeof data.title !== 'string' || !data.title) {
    throw new Error('Wizard config must have a title (string)');
  }

  if (typeof data.description !== 'string') {
    throw new Error('Wizard config must have a description (string)');
  }

  if (typeof data.targetDoc !== 'string' || !data.targetDoc) {
    throw new Error('Wizard config must have a targetDoc (string)');
  }

  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    throw new Error('Wizard config must have at least one step');
  }

  // Track all step IDs to ensure uniqueness
  const stepIds = new Set<string>();

  // Validate each step recursively
  const validateStep = (step: any, path: string): void => {
    if (!step || typeof step !== 'object') {
      throw new Error(`Step at ${path} must be an object`);
    }

    if (typeof step.id !== 'string' || !step.id) {
      throw new Error(`Step at ${path} must have an id (string)`);
    }

    if (stepIds.has(step.id)) {
      throw new Error(`Duplicate step ID: ${step.id}`);
    }
    stepIds.add(step.id);

    if (typeof step.title !== 'string' || !step.title) {
      throw new Error(`Step ${step.id} must have a title (string)`);
    }

    if (typeof step.type !== 'string') {
      throw new Error(`Step ${step.id} must have a type (string)`);
    }

    // Validate based on step type
    switch (step.type) {
      case 'question':
        validateQuestionStep(step, path);
        break;
      case 'llm-processing':
        validateLlmProcessingStep(step, path);
        break;
      case 'compound':
        validateCompoundStep(step, path);
        break;
      case 'information':
        validateInformationStep(step, path);
        break;
      default:
        throw new Error(`Step ${step.id} has unknown type: ${step.type}`);
    }
  };

  const validateQuestionStep = (step: any, path: string): void => {
    const validTypes = ['text', 'textarea', 'scale', 'multi-select', 'single-select'];
    if (!validTypes.includes(step.questionType)) {
      throw new Error(
        `Step ${step.id} has invalid questionType: ${step.questionType}. Must be one of: ${validTypes.join(', ')}`
      );
    }

    if (typeof step.question !== 'string' || !step.question) {
      throw new Error(`Question step ${step.id} must have a question (string)`);
    }

    // Validate scale-specific fields
    if (step.questionType === 'scale') {
      if (typeof step.min !== 'number') {
        throw new Error(`Scale question ${step.id} must have a min (number)`);
      }
      if (typeof step.max !== 'number') {
        throw new Error(`Scale question ${step.id} must have a max (number)`);
      }
      if (step.min >= step.max) {
        throw new Error(`Scale question ${step.id}: min must be less than max`);
      }
    }

    // Validate select-specific fields
    if (step.questionType === 'multi-select' || step.questionType === 'single-select') {
      if (!step.options) {
        throw new Error(`Select question ${step.id} must have options`);
      }

      // Options can be array or string (for dynamic options)
      if (typeof step.options === 'string') {
        // Dynamic options like "{{extracted_traits}}"
        if (!step.options.startsWith('{{') || !step.options.endsWith('}}')) {
          throw new Error(
            `Select question ${step.id}: dynamic options must be in format {{variableName}}`
          );
        }
      } else if (Array.isArray(step.options)) {
        if (step.options.length === 0) {
          throw new Error(`Select question ${step.id} must have at least one option`);
        }
        step.options.forEach((opt: any, i: number) => {
          if (!opt.value || !opt.label) {
            throw new Error(
              `Option ${i} in question ${step.id} must have value and label`
            );
          }
        });
      } else {
        throw new Error(`Select question ${step.id}: options must be array or string`);
      }
    }
  };

  const validateLlmProcessingStep = (step: any, path: string): void => {
    if (typeof step.hidden !== 'boolean') {
      throw new Error(`LLM processing step ${step.id} must have hidden (boolean)`);
    }

    if (!step.prompt || typeof step.prompt !== 'object') {
      throw new Error(`LLM processing step ${step.id} must have a prompt (object)`);
    }

    if (typeof step.prompt.user !== 'string' || !step.prompt.user) {
      throw new Error(
        `LLM processing step ${step.id}: prompt must have user message (string)`
      );
    }

    if (typeof step.resultKey !== 'string' || !step.resultKey) {
      throw new Error(`LLM processing step ${step.id} must have a resultKey (string)`);
    }
  };

  const validateLlmApprovalStep = (step: any, path: string): void => {
    if (typeof step.sourceKey !== 'string' || !step.sourceKey) {
      throw new Error(`LLM approval step ${step.id} must have a sourceKey (string)`);
    }

    const validFormats = ['text', 'list', 'json'];
    if (!validFormats.includes(step.displayFormat)) {
      throw new Error(
        `LLM approval step ${step.id} has invalid displayFormat: ${step.displayFormat}. Must be one of: ${validFormats.join(', ')}`
      );
    }
  };

  const validateCompoundStep = (step: any, path: string): void => {
    if (!Array.isArray(step.subSteps) || step.subSteps.length === 0) {
      throw new Error(`Compound step ${step.id} must have at least one sub-step`);
    }

    step.subSteps.forEach((subStep: any, i: number) => {
      validateStep(subStep, `${path}.subSteps[${i}]`);
    });
  };

  const validateInformationStep = (step: any, path: string): void => {};

  // Validate all top-level steps
  data.steps.forEach((step: any, i: number) => {
    validateStep(step, `steps[${i}]`);
  });

  return data as WizardConfig;
}