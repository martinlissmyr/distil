// src/wizards/types.ts
import type { EditorKind } from '../types/chat';
import type { DocRef, MetaDocKey } from '../types/metaDoc';
import type { Editor } from '@tiptap/react';
import type { RefObject } from 'react';

/**
 * Core wizard configuration
 */

export type WizardId = string;
export type WizardValue =
  | string
  | number
  | boolean
  | null
  | WizardValue[]
  | { [key: string]: WizardValue };
export type WizardValueMap = Record<string, WizardValue>;

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
  | InformationStep
  | CompoundStep;


/**
 * A step that just presents som information to the user
 */
export type InformationStep = BaseStep & {
  type: 'information';
  illustration: string;
};

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
    rejectLabel?: string;
  };
  editableResult?: boolean;
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
  system?: string; // key, not content
  user: string; // key, not content
};

/**
 * Conditional logic for skipIf
 */
export type ConditionExpression =
  | { type: 'isEmpty'; stepId: string }
  | { type: 'equals'; stepId: string; value: WizardValue }
  | { type: 'contains'; stepId: string; value: WizardValue }
  | { type: 'and'; conditions: ConditionExpression[] }
  | { type: 'or'; conditions: ConditionExpression[] };

/**
 * Context for wizard launch (where it was triggered from).
 *
 * Simplified from previous version which had redundant fields:
 * - editorKind + projectId + storyId duplicated info in targetScope
 * - targetKey was redundant with the docKind in a unified ref
 *
 * Now uses unified DocRef type with required docKind.
 */
export type WizardContext = {
  /** The document being edited (scope + kind + IDs) */
  ref: DocRef & { docKind: EditorKind };

  /** Optional: if wizard targets a different doc (usually same as ref) */
  targetKey?: MetaDocKey;

  /** TipTap Editor instance or Input Ref to insert results into */
  targetEditor?: Editor | null;
  targetInputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  currentContent?: string;

  llmContext?: {
    kinds: EditorKind[];
    markdown: string;
  };

  /** Optional: Current entity projection for template interpolation */
  currentProjection?: WizardValueMap;
};

/**
 * Active wizard session state
 */
export type ActiveWizard = {
  id: string;
  title: string;
  config: WizardConfig;
  currentStepPath: number[];
  answers: WizardValueMap;
  completedSteps: Set<string>;
  llmResults: WizardValueMap;
  llmDrafts?: Record<string, string>;
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
  setAnswer: (stepId: string, value: WizardValue) => void;
  getAnswer: (stepId: string) => WizardValue | undefined;
  processLlmStep: (step: LlmProcessingStep) => Promise<void>;
  clearLlmResult: (resultKey: string) => void;
  bakeWizard: () => Promise<string>;
  insertResult: (text: string) => Promise<void>;
  setLlmResult: (resultKey: string, value: WizardValue) => void;
  setLlmDraft: (resultKey: string, value: string) => void;
};
