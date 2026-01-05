// src/chat/prompts/buildFromTemplates.ts
import type { EditorKind } from '../../types/chat';
import { type WritingLanguage, DEFAULT_WRITING_LANGUAGE, WRITING_LANGUAGE_LABEL } from '../../types/language';

// Import markdown files as raw strings
import systemMd from './system/system.md?raw';
import contextTemplateMd from './assistant/context.md?raw';
import TaskMd from './user/task.md?raw';

import {interpolate} from '../../helpers/interpolate';
import { getSystemRoleForDocKind, getSystemTriggersForDocKind } from '../../models/docs';

/**
 * Build the system message with dynamic content
 */
export function buildSystemPrompt(params: {
  kind: EditorKind;
  language: WritingLanguage;
}): string {
  const { kind, language = DEFAULT_WRITING_LANGUAGE } = params;

  const roleMd = getSystemRoleForDocKind(kind);
  const triggersMd = getSystemTriggersForDocKind(kind);

  const prompt = interpolate(systemMd, {
    role: roleMd,
    triggers: triggersMd,
    responseLanguage: WRITING_LANGUAGE_LABEL[language],
  });

  console.log(prompt);

  return prompt;
}

/**
 * Build the assistant context message with dynamic content
 */
export function buildAssistantContext(params: {
  title: string;
  fullTextMarkdown: string;
  contextMarkdown: string;
  selectionMarkdown?: string;
  scope: 'selection' | 'text';
}): string {
  const { title, fullTextMarkdown, contextMarkdown, selectionMarkdown, scope } = params;

  return interpolate(contextTemplateMd, {
    title,
    fullTextMarkdown: fullTextMarkdown || '',
    contextDocumentsMarkdown: contextMarkdown || '',
    selectionMarkdown: selectionMarkdown || '',
    hasSelection: scope === 'selection' && selectionMarkdown,
  }).trim();
}

/**
 * Build the user prompt
 */
export function buildUserPrompt(params: {
  rawUserPrompt: string;
  contextSummary: string;
  fullTextMarkdown: string;
  scope: 'selection' | 'text';
}): string {
  const { rawUserPrompt, contextSummary, fullTextMarkdown, scope } = params;

  return interpolate(TaskMd, {
    rawUserPrompt,
    contextSummary: contextSummary || '',
    fullTextMarkdown: fullTextMarkdown || '',
    hasSelection: scope === 'selection',
  }).trim();
}
