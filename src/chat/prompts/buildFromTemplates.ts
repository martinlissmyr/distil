// src/chat/prompts/buildFromTemplates.ts
import type { EditorKind } from '../../types/chat';

// Import markdown files as raw strings
import proseSystemMd from './system/prose.md?raw';
import manifestSystemMd from './system/manifest.md?raw';
import outlineSystemMd from './system/outline.md?raw';
import briefSystemMd from './system/brief.md?raw';
import defaultSystemMd from './system/default.md?raw';
import contextTemplateMd from './assistant/context.md?raw';
import proseUserMd from './user/prose.md?raw';

/**
 * Simple template interpolator
 * Supports:
 * - {{variable}} - simple variable replacement
 * - {{#if variable}}...{{/if}} - conditional blocks
 */
function interpolate(template: string, vars: Record<string, any>): string {
  let result = template;

  // Handle conditional blocks: {{#if key}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => (vars[key] ? content : '')
  );

  // Handle simple variables: {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined && value !== null ? String(value) : '';
  });

  return result;
}

/**
 * System prompts for each editor kind
 */
export const systemPrompts: Record<EditorKind, string> = {
  prose: proseSystemMd.trim(),
  manifest: manifestSystemMd.trim(),
  outline: outlineSystemMd.trim(),
  brief: briefSystemMd.trim(),
};

/**
 * Default system prompt for unknown editor kinds
 */
export const defaultSystemPrompt = defaultSystemMd.trim();

/**
 * Build the assistant context message with dynamic content
 */
export function buildAssistantContext(params: {
  title: string;
  fullTextMarkdown: string;
  manifestMarkdown: string | null;
  selectionMarkdown?: string;
  scope: 'selection' | 'text';
}): string {
  const { title, fullTextMarkdown, manifestMarkdown, selectionMarkdown, scope } = params;

  return interpolate(contextTemplateMd, {
    title,
    fullTextMarkdown: fullTextMarkdown || '',
    manifestMarkdown: manifestMarkdown || '',
    selectionMarkdown: selectionMarkdown || '',
    hasSelection: scope === 'selection' && selectionMarkdown,
  }).trim();
}

/**
 * Build the user prompt for prose editor
 */
export function buildProseUserPrompt(params: {
  rawUserPrompt: string;
  manifestMarkdown: string | null;
  scope: 'selection' | 'text';
}): string {
  const { rawUserPrompt, manifestMarkdown, scope } = params;

  return interpolate(proseUserMd, {
    rawUserPrompt,
    manifestStatus: manifestMarkdown ? '(loaded)' : '(may be missing)',
    hasSelection: scope === 'selection',
  }).trim();
}
