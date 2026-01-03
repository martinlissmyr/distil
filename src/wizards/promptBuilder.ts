// src/wizards/promptBuilder.ts
import type { LlmProcessingStep, WizardContext, ActiveWizard } from './types';
import type { MetaDocKey } from '../types/metaDoc';
import { interpolate } from '../helpers/interpolate';
import { WRITING_LANGUAGE_LABEL, DEFAULT_WRITING_LANGUAGE } from '../types/language';

// Vite prompt loading (./prompts/<key>.md)
const promptLoaders = import.meta.glob('./configs/prompts/*.md', {
  query: '?raw',
  import: 'default',
});

// cache by full path: "./prompts/<key>.md"
const promptCache = new Map<string, string>();

export async function loadPromptByKey(key: string): Promise<string> {
  const file = key.endsWith('.md') ? key : `${key}.md`;
  const path = `./configs/prompts/${file}`;

  const cached = promptCache.get(path);
  if (cached != null) return cached;

  const loader = promptLoaders[path];
  if (!loader) {
    console.warn(`[wizard promptBuilder] Missing prompt file: ${path}`);
    return '';
  }

  const content = (await loader()) as string;
  promptCache.set(path, content);

  return content;
}

export type PromptBuilderDeps = {
  // Get current writing language
  getWritingLanguage: () => string;
};

export type BuiltPrompt = {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  summary: string;
};

/**
 * Builds interpolated prompt messages from an LLM processing step.
 * Extracted from wizard engine to be reusable in test UI.
 */
export async function buildPromptForStep(
  step: LlmProcessingStep,
  answers: Record<string, any>,
  llmResults: Record<string, any>,
  wizardContext: WizardContext,
  deps: PromptBuilderDeps,
  useTestPrompt = false
): Promise<BuiltPrompt> {
  const writingLanguage = deps.getWritingLanguage();
  const writingLanguageName = WRITING_LANGUAGE_LABEL[writingLanguage] || WRITING_LANGUAGE_LABEL[DEFAULT_WRITING_LANGUAGE];

  // Merge contexts: answers, llmResults, and metaDocs
  const vars = {
    ...answers,
    ...llmResults,
    contextDocumentsMarkdown: wizardContext.llmContext?.markdown || '',
    currentContent: wizardContext.currentContent || '',
    writingLanguageName,
  };

  // step.prompt.* are KEYS now
  const systemTemplateKey = step.prompt.system;
  const userTemplateKey = useTestPrompt
    ? `${step.prompt.user}.test` // Try to load .test version
    : step.prompt.user;

  const systemTemplate = systemTemplateKey ? await loadPromptByKey(systemTemplateKey) : '';
  const userTemplate = await loadPromptByKey(userTemplateKey);
  const assistantTemplate = await loadPromptByKey('assistant');

  // Interpolate system and user separately
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (systemTemplate.trim()) {
    messages.push({
      role: 'system',
      content: interpolate(systemTemplate, vars),
    });
  }

  messages.push({
    role: 'assistant',
    content: interpolate(assistantTemplate, vars),
  });

  messages.push({
    role: 'user',
    content: interpolate(userTemplate, vars),
  });

  const summaryHeader = {
    system: 'SYSTEM PROMPT',
    user: 'USER PROMPT',
    assistant: 'ASSISTANT PROMPT',
  }

  const summary = messages
    .map((m) => {
      return `## ${summaryHeader[m.role] || 'UNKNOWN'}\n\n${m.content}`;
    })
    .join('\n\n---\n\n');

  return { messages, summary };
}

/**
 * Checks if a test prompt file exists for a given LLM step.
 */
export function hasTestPrompt(step: LlmProcessingStep): boolean {
  const userTemplateKey = step.prompt.user;
  const testFile = `${userTemplateKey}.test.md`;
  const path = `./configs/prompts/${testFile}`;
  return path in promptLoaders;
}
