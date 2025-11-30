// src/wizards/promptInterpolator.ts
import type { ActiveWizard, PromptTemplate } from './types';
import type { MetaDocKey } from '../types/metaDoc';

/**
 * Interpolates variables in a prompt template string.
 *
 * Variables are referenced like: {{stepId}}, {{manifest}}, {{brief}}, {{outline}}
 *
 * Available variable types:
 * - {{stepId}} - References an answer from a question step
 * - {{resultKey}} - References an LLM processing result
 * - {{manifest}} - References the root manifest metaDoc
 * - {{brief}} - References the story brief metaDoc
 * - {{outline}} - References the story outline metaDoc
 */
export function interpolatePrompt(
  template: string,
  context: {
    answers: Record<string, any>;
    llmResults: Record<string, any>;
    metaDocs: Record<string, string>; // key -> markdown content
  }
): string {
  let result = template;

  // Find all {{variable}} patterns
  const variablePattern = /\{\{(\w+)\}\}/g;
  const matches = [...template.matchAll(variablePattern)];

  for (const match of matches) {
    const variableName = match[1];
    const placeholder = match[0]; // Full "{{variableName}}"

    let value: any = undefined;

    // Check answers first (question step results)
    if (variableName in context.answers) {
      value = context.answers[variableName];
    }
    // Check LLM results second
    else if (variableName in context.llmResults) {
      value = context.llmResults[variableName];
    }
    // Check metaDocs last (manifest, brief, outline)
    else if (variableName in context.metaDocs) {
      value = context.metaDocs[variableName];
    }

    // Format value for replacement
    if (value !== undefined && value !== null) {
      const formatted = formatValue(value);
      result = result.replace(placeholder, formatted);
    } else {
      // Variable not found - leave placeholder or replace with empty
      result = result.replace(placeholder, `[Missing: ${variableName}]`);
    }
  }

  return result;
}

/**
 * Formats a value for insertion into a prompt.
 */
function formatValue(value: any): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    // For multi-select answers, join with commas
    return value.join(', ');
  }

  if (typeof value === 'object') {
    // For JSON results from LLM extraction
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Interpolates a full prompt template (system + user messages)
 */
export function interpolatePromptTemplate(
  template: PromptTemplate,
  context: {
    answers: Record<string, any>;
    llmResults: Record<string, any>;
    metaDocs: Record<string, string>;
  }
): { system?: string; user: string } {
  return {
    system: template.system ? interpolatePrompt(template.system, context) : undefined,
    user: interpolatePrompt(template.user, context),
  };
}

/**
 * Builds interpolation context from active wizard and metaDocs
 */
export function buildInterpolationContext(
  wizard: ActiveWizard,
  metaDocsMarkdown: Record<MetaDocKey, string | null>
): {
  answers: Record<string, any>;
  llmResults: Record<string, any>;
  metaDocs: Record<string, string>;
} {
  // Filter out null metaDocs
  const metaDocs: Record<string, string> = {};
  for (const [key, markdown] of Object.entries(metaDocsMarkdown)) {
    if (markdown !== null) {
      metaDocs[key] = markdown;
    }
  }

  return {
    answers: wizard.answers,
    llmResults: wizard.llmResults,
    metaDocs,
  };
}
