// src/chat/prompts/buildFromTemplates.ts
import type { EditorKind } from '../../types/chat';

// Import markdown files as raw strings
import proseSystemRoleMd from './system/proseRole.md?raw';
import manifestSystemRoleMd from './system/manifestRole.md?raw';
import outlineSystemRoleMd from './system/outlineRole.md?raw';
import briefSystemRoleMd from './system/briefRole.md?raw';
import worldSystemRoleMd from './system/worldRole.md?raw';
import defaultSystemRoleMd from './system/defaultRole.md?raw';
import systemMd from './system/system.md?raw';
import contextTemplateMd from './assistant/context.md?raw';
import TaskMd from './user/task.md?raw';

// Import helper
import {interpolate} from '../../helpers/interpolate';

/**
 * Build the system message with dynamic content
 */
export function buildSystemPrompt(params: {
  kind: string;
}): string {
  const { kind } = params;
  const roleMd = {
    "prose": proseSystemRoleMd,
    "brief": briefSystemRoleMd,
    "world": worldSystemRoleMd,
    "manifest": manifestSystemRoleMd,
    "outline": outlineSystemRoleMd,
  }

  return interpolate(systemMd, {
    role: roleMd[kind] || defaultSystemRoleMd,
    responseLanguage: 'swedish',
  });
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
