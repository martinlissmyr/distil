// src/wizards/types.ts
import type { EditorKind } from '../types/chat';
import type { MetaScope, MetaDocKey } from '../types/metaDoc';

/**
 * Core wizard configuration
 */

export type WizardId = string;

export type OpenWizardCommand = {
  type: 'openWizard';
  wizardId: WizardId;
};

export type WizardConfig = {
  id: string;
  version: string;
  title: string;
  description: string;
  targetDoc: MetaDocKey;
  steps: WizardStep[];
  /**
   * Optional output template for formatting the final wizard result.
   * Uses the same interpolation pattern as prompts: {{stepId}}, {{resultKey}}
   * If not provided, defaults to including all answers and LLM results.
   */
  outputTemplate?: string;
};

/**
 * Base properties shared by all step types
 */
export type BaseStep = {
  id: string;
  title: string;
  description?: string;
  skipIf?: ConditionExpression;
};

/**
 * Union of all step types
 */
export type WizardStep =
  | QuestionStep
  | LlmProcessingStep
  | LlmApprovalStep
  | CompoundStep;

/**
 * User input step with various question types
 */
export type QuestionStep = BaseStep & {
  type: 'question';
  questionType: 'text' | 'textarea' | 'scale' | 'multi-select' | 'single-select';
  question: string;
  placeholder?: string;

  // For scale questions
  min?: number;
  max?: number;
  scaleLabels?: { min: string; max: string };

  // For select questions
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }> | string; // String for dynamic options like "{{extracted_traits}}"

  // Validation
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minSelections?: number;
  maxSelections?: number;
};

/**
 * LLM processing step that auto-executes and advances
 */
export type LlmProcessingStep = BaseStep & {
  type: 'llm-processing';
  hidden: boolean;
  prompt: PromptTemplate;
  resultKey: string;
  extractJson?: boolean;
  retryOnError?: number;
  approvalOptions?: {
    approveLabel?: string;
    rejectLabel?: string;
  };
};

/**
 * Show LLM result and get user approval
 */
export type LlmApprovalStep = BaseStep & {
  type: 'llm-approval';
  sourceKey: string;
  displayFormat: 'text' | 'list' | 'json';
  approvalOptions?: {
    approveLabel?: string;
    rejectLabel?: string;
    editLabel?: string;
  };
  onReject?: 'retry-previous' | 'skip';
};

/**
 * Container for nested sub-steps
 */
export type CompoundStep = BaseStep & {
  type: 'compound';
  subSteps: WizardStep[];
  showProgress?: boolean;
};

/**
 * Prompt template with variable interpolation
 * Variables referenced like: {{step1_question}}, {{manifest}}, {{extracted_traits}}
 */
export type PromptTemplate = {
  system?: string;
  user: string;
};

/**
 * Conditional logic for skipIf
 */
export type ConditionExpression =
  | { type: 'isEmpty'; stepId: string }
  | { type: 'equals'; stepId: string; value: any }
  | { type: 'contains'; stepId: string; value: any }
  | { type: 'and'; conditions: ConditionExpression[] }
  | { type: 'or'; conditions: ConditionExpression[] };

/**
 * Context for wizard launch (where it was triggered from)
 */
export type WizardContext = {
  editorKind: EditorKind;
  projectId?: string;
  storyId?: string;
  targetScope: MetaScope;
  targetKey: MetaDocKey;
  targetEditor?: any; // TipTap Editor instance to insert results into
};

/**
 * Active wizard session state
 */
export type ActiveWizard = {
  id: string;
  title: string;
  config: WizardConfig;
  currentStepPath: number[];
  answers: Record<string, any>;
  completedSteps: Set<string>;
  llmResults: Record<string, any>;
  isLlmProcessing: boolean;
  startedAt: number;
  hasUnsavedProgress: boolean;
  error?: string;
};

/**
 * Wizard state slice for Zustand store
 */
export type WizardState = {
  activeWizard: ActiveWizard | null;
  wizardContext: WizardContext | null;
};

/**
 * Wizard actions for Zustand store
 */
export type WizardActions = {
  startWizard: (wizardId: string, context: WizardContext) => Promise<void>;
  closeWizard: (force?: boolean) => boolean;
  goToStep: (stepPath: number[]) => void;
  nextStep: () => Promise<void>;
  previousStep: () => void;
  setAnswer: (stepId: string, value: any) => void;
  getAnswer: (stepId: string) => any;
  processLlmStep: (step: LlmProcessingStep) => Promise<void>;
  clearLlmResult: (resultKey: string) => void;
  bakeWizard: () => Promise<string>;
  insertResult: (text: string) => Promise<void>;
};
