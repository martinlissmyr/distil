// src/chat/buildPrompt.ts
import type { EditorKind, QuestionScope } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import {
  buildSystemPrompt,
  defaultSystemPrompt,
  buildAssistantContext,
  buildUserPrompt,
} from './prompts/buildFromTemplates';
import { getContextDocs } from './contextSelector';

// Re-export types for backwards compatibility
export type { EditorKind, QuestionScope };

export type BuiltPrompt = {
  system: string;
  assistant: string;
  user: string;
  includedContexts: string[]; // List of context document keys that were included
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
  apiKey?: string;
  language?: 'sv' | 'en';
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
  apiKey,
  language = 'sv',
}: BuildPromptArgs): Promise<BuiltPrompt> {
  const {
    kinds: contextKinds,
    markdown: contextMarkdown,
  } = await getContextDocs(kind, rawUserPrompt, projectId, storyId, {
    apiKey,
    language,
  });

  // Build context summary for user prompt with descriptive labels
  const contextDescriptions: Record<MetaDocKey, string> = {
    story: 'The story (what the author is currently working on)',
    manifest: 'An author manifest (style/tone)',
    brief: 'A story brief (high-level concept)',
    outline: 'A story outline (structure/plot)',
    world: 'World information (setting/worldbuilding)',
  };
  const contextSummaryItems: string[] = [];

  if (fullTextMarkdown) {
    contextSummaryItems.push('- The full main text: ' + contextDescriptions[kind]);
  }

  if (scope === 'selection' && selectionMarkdown) {
    contextSummaryItems.push('- A snippet of: ' + contextDescriptions[kind]);
  }

  for (const docKey of contextKinds) {
    if (docKey in contextDescriptions) {
      contextSummaryItems.push('- ' + contextDescriptions[docKey as MetaDocKey]);
    }
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

  prompt.system = buildSystemPrompt({
    kind
  })

  prompt.user = buildUserPrompt({
    rawUserPrompt,
    contextSummary,
    fullTextMarkdown,
    scope,
  });

  return prompt;
}