// src/chat/buildChatPrompt.ts
import type { EditorKind, QuestionScope } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import type { WritingLanguage } from '../types/language';
import {
  DEFAULT_WRITING_LANGUAGE,
  WRITING_LANGUAGE_LABEL,
} from '../types/language';

import { getContextDocs } from './contextSelector';
import {
  getDocDescription,
  getSystemRoleForDocKind,
  getSystemTriggersForDocKind,
} from '../models/docs';

import { interpolate } from '../helpers/interpolate';

// Import markdown files as raw strings
import systemMd from './prompts/chatSystemPrompt.md?raw';
import contextTemplateMd from './prompts/chatAssistantPrompt.md?raw';
import taskMd from './prompts/chatUserPrompt.md?raw';

export type BuiltPrompt = {
  system: string;
  assistant: string;
  user: string;
  includedContexts: MetaDocKey[]; // List of context document keys that were included
};

type BuildPromptArgs = {
  rawUserPrompt: string;
  kind: EditorKind;
  title: string;
  scope: QuestionScope;
  fullTextMarkdown: string;
  selectionMarkdown?: string;
  // Optional: For intelligent context selection
  projectId?: string;
  storyId?: string;
  language?: WritingLanguage;
};

// -------------------------------------------------------------
// Template builders (merged from buildFromTemplates.ts)
// -------------------------------------------------------------

function buildSystemPrompt(params: {
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

  console.log(`SYSTEM PROMPT\n-----------\n${prompt}`);

  return prompt;
}

function buildAssistantContext(params: {
  title: string;
  fullTextMarkdown: string;
  contextMarkdown: string;
  selectionMarkdown?: string;
  scope: 'selection' | 'text';
}): string {
  const {
    title,
    fullTextMarkdown,
    contextMarkdown,
    selectionMarkdown,
    scope,
  } = params;

  const prompt = interpolate(contextTemplateMd, {
    title,
    fullTextMarkdown: fullTextMarkdown || '',
    contextDocumentsMarkdown: contextMarkdown || '',
    selectionMarkdown: selectionMarkdown || '',
    hasSelection: scope === 'selection' && !!selectionMarkdown,
  }).trim();

  console.log(`ASSISTANT PROMPT\n-----------\n${prompt}`);

  return prompt;
}

function buildUserPrompt(params: {
  rawUserPrompt: string;
  contextSummary: string;
  selectionMarkdown?: string;
  scope: 'selection' | 'text';
}): string {
  const { rawUserPrompt, contextSummary, selectionMarkdown, scope } = params;

  const prompt = interpolate(taskMd, {
    rawUserPrompt,
    contextSummary: contextSummary || '',
    selectionMarkdown: selectionMarkdown || '',
    hasSelection: scope === 'selection',
  }).trim();

  console.log(`USER PROMPT\n-----------\n${prompt}`);

  return prompt;
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------

export async function buildPrompt({
  rawUserPrompt,
  kind,
  title,
  scope,
  fullTextMarkdown,
  selectionMarkdown = '',
  projectId,
  storyId,
  language = DEFAULT_WRITING_LANGUAGE,
}: BuildPromptArgs): Promise<BuiltPrompt> {
  // 1) Build a preliminary user prompt (no contextSummary yet) for context determination
  const preliminaryUserPrompt = buildUserPrompt({
    rawUserPrompt,
    contextSummary: '',
    selectionMarkdown,
    scope,
  });

  // 2) Load context docs
  const { kinds: contextKinds, markdown: contextMarkdown } = await getContextDocs(
    kind,
    preliminaryUserPrompt,
    projectId,
    storyId,
    { language }
  );

  // 3) Build a context summary (for user prompt)
  const contextSummaryItems: string[] = [];

  if (fullTextMarkdown) {
    contextSummaryItems.push('- The full main text: ' + getDocDescription(kind));
  }

  if (scope === 'selection' && selectionMarkdown) {
    contextSummaryItems.push('- A snippet of: ' + getDocDescription(kind));
  }

  for (const docKey of contextKinds) {
    contextSummaryItems.push('- ' + getDocDescription(docKey as MetaDocKey));
  }

  const contextSummary =
    contextSummaryItems.length > 0
      ? `You've been given:\n${contextSummaryItems.join('\n')}`
      : '';

  const prompt: BuiltPrompt = {
    system: '',
    assistant: '',
    user: '',
    includedContexts: contextKinds,
  };

  // 4) Assistant context
  prompt.assistant = buildAssistantContext({
    title,
    fullTextMarkdown,
    contextMarkdown,
    selectionMarkdown,
    scope,
  });

  // 5) System prompt
  prompt.system = buildSystemPrompt({
    kind,
    language,
  });

  // 6) User prompt
  prompt.user = buildUserPrompt({
    rawUserPrompt,
    contextSummary,
    selectionMarkdown,
    scope,
  });

  return prompt;
}