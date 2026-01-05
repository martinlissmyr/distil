// src/chat/buildPrompt.ts
import type { EditorKind, QuestionScope } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import type { WritingLanguage } from '../types/language';
import { DEFAULT_WRITING_LANGUAGE } from '../types/language';

import {
  buildSystemPrompt,
  buildAssistantContext,
  buildUserPrompt,
} from './prompts/buildFromTemplates';
import { getContextDocs } from './contextSelector';
import { getDocDescription } from '../models/docs';

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

  // First, build a preliminary user prompt for use in context determination
  const preliminaryUserPrompt = buildUserPrompt({
    rawUserPrompt,
    selectionMarkdown,
    scope,
  });

  const {
    kinds: contextKinds,
    markdown: contextMarkdown,
  } = await getContextDocs(kind, preliminaryUserPrompt, projectId, storyId, {
    language,
  });

  const contextSummaryItems: string[] = [];

  if (fullTextMarkdown) {
    contextSummaryItems.push(
      '- The full main text: ' + getDocDescription(kind)
    );
  }

  if (scope === 'selection' && selectionMarkdown) {
    contextSummaryItems.push(
      '- A snippet of: ' + getDocDescription(kind)
    );
  }

  for (const docKey of contextKinds) {
    // contextKinds is expected to be MetaDocKey[] or similar
    contextSummaryItems.push(
      '- ' + getDocDescription(docKey as MetaDocKey)
    );
  }

  const contextSummary =
    contextSummaryItems.length > 0
      ? `You've been given:\n${contextSummaryItems.join('\n')}`
      : '';

  const prompt: BuiltPrompt = {
    system: '',
    assistant: '',
    user: '',
    includedContexts: contextKinds, // for tests etc
  };

  // Assistant context
  prompt.assistant = buildAssistantContext({
    title,
    fullTextMarkdown,
    contextMarkdown,
    selectionMarkdown,
    scope,
  });

  // System prompt
  prompt.system = buildSystemPrompt({
    kind,
    language
  });

  // User prompt
  prompt.user = buildUserPrompt({
    rawUserPrompt,
    contextSummary,
    fullTextMarkdown,
    selectionMarkdown,
    scope,
  });

  return prompt;
}