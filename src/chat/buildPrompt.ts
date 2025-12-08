// src/chat/buildPrompt.ts
import type { EditorKind, QuestionScope } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import {
  systemPrompts,
  defaultSystemPrompt,
  buildAssistantContext,
  buildProseUserPrompt,
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
    docs: contextDocs,     // currently unused but nice to keep around
    markdown: contextMarkdown,
  } = await getContextDocs(kind, rawUserPrompt, projectId, storyId, {
    apiKey,
    language,
  });

  // Build context summary for user prompt with descriptive labels
  const contextSummaryItems: string[] = [];

  const contextDescriptions: Record<MetaDocKey, string> = {
    manifest: '- An author manifest (style/tone)',
    brief: '- A story brief (high-level concept)',
    outline: '- A story outline (structure/plot)',
    world: '- World information (setting/worldbuilding)',
  };

  for (const docKey of contextKinds) {
    if (docKey in contextDescriptions) {
      contextSummaryItems.push(contextDescriptions[docKey as MetaDocKey]);
    }
  }

  if (fullTextMarkdown) {
    contextSummaryItems.push('- The full text of the piece (may be partial)');
  }

  if (scope === 'selection' && selectionMarkdown) {
    contextSummaryItems.push('- A snippet (current selection)');
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

  // Assistant context (shared across editor kinds)
  prompt.assistant = buildAssistantContext({
    title,
    fullTextMarkdown,
    contextMarkdown,
    selectionMarkdown,
    scope,
  });

  // System + user prompts per editor kind
  switch (kind) {
    case 'prose': {
      prompt.system = systemPrompts.prose;
      prompt.user = buildProseUserPrompt({
        rawUserPrompt,
        contextSummary,
        fullTextMarkdown,
        scope,
      });
      break;
    }

    case 'manifest': {
      prompt.system = systemPrompts.manifest;
      prompt.user = rawUserPrompt;
      break;
    }

    case 'outline': {
      prompt.system = systemPrompts.outline;
      prompt.user = rawUserPrompt;
      break;
    }

    case 'brief': {
      prompt.system = systemPrompts.brief;
      prompt.user = rawUserPrompt;
      break;
    }

    default: {
      prompt.system = defaultSystemPrompt;
      prompt.user = rawUserPrompt;
    }
  }

  return prompt;
}