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
 * - {{#if !variable}}...{{/if}} - negation with !
 * - {{#if var1 && var2}}...{{/if}} - AND conditions with &&
 */
function interpolate(template: string, vars: Record<string, any>): string {
  let result = template;

  // Handle conditional blocks: {{#if expression}}...{{/if}}
  // Also capture leading and trailing newlines to remove them when condition is false
  result = result.replace(
    /(\n?)\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}(\n?)/g,
    (match, leadingNewline, expression, content, trailingNewline) => {
      const condition = evaluateCondition(expression.trim(), vars);
      if (condition) {
        // Keep the content and the leading newline
        return leadingNewline + content;
      } else {
        // Remove everything including leading and trailing newlines
        return '';
      }
    }
  );

  // Handle simple variables: {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined && value !== null ? String(value) : '';
  });

  // Collapse multiple consecutive blank lines into a single blank line
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return result;
}

/**
 * Evaluate a conditional expression
 * Supports: variable, !variable, var1 && var2, !var1 && var2, etc.
 */
function evaluateCondition(expression: string, vars: Record<string, any>): boolean {
  // Split by && operator
  const andParts = expression.split('&&').map(part => part.trim());

  // All parts must be true for the whole expression to be true
  return andParts.every(part => {
    // Check for negation
    if (part.startsWith('!')) {
      const varName = part.slice(1).trim();
      return !isTruthy(vars[varName]);
    }

    // Simple variable check
    return isTruthy(vars[part]);
  });
}

/**
 * Check if a value is truthy
 */
function isTruthy(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  return true;
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
  fullTextMarkdown: string;
  scope: 'selection' | 'text';
}): string {
  const { rawUserPrompt, manifestMarkdown, fullTextMarkdown, scope } = params;

  return interpolate(proseUserMd, {
    rawUserPrompt,
    manifestMarkdown: manifestMarkdown || '',
    fullTextMarkdown: fullTextMarkdown || '',
    hasSelection: scope === 'selection',
  }).trim();
}
