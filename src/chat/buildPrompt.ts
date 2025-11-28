// src/chat/buildPrompt.ts
import { useAppStore, metaId } from '../state/useAppStore';
import type { EditorKind, QuestionScope } from '../types/chat';
import {
  systemPrompts,
  defaultSystemPrompt,
  buildAssistantContext,
  buildProseUserPrompt,
} from './prompts/buildFromTemplates';

// Re-export types for backwards compatibility
export type { EditorKind, QuestionScope };

export type BuiltPrompt = {
  system: string;
  assistant: string;
  user: string;
};

type BuildPromptArgs = {
  rawUserPrompt: string;
  kind: EditorKind;
  title: string;
  scope: QuestionScope;
  fullTextMarkdown: string;
  selectionMarkdown?: string;
};

export function buildPrompt({
  rawUserPrompt,
  kind,
  title,
  scope,
  fullTextMarkdown,
  selectionMarkdown = '',
}: BuildPromptArgs): BuiltPrompt {
  const state = useAppStore.getState();

  // Look up manifest
  const manifestId = metaId({ kind: 'root' } as const, 'manifest');
  const manifestState = state.metaDocs[manifestId];
  const manifestMarkdown = manifestState?.markdown ?? null;

  const prompt: BuiltPrompt = {
    system: '',
    assistant: '',
    user: '',
  };

  // Build assistant context (shared across all editor kinds)
  prompt.assistant = buildAssistantContext({
    title,
    fullTextMarkdown,
    manifestMarkdown,
    selectionMarkdown,
    scope,
  });

  // Build system and user prompts per editor kind
  switch (kind) {
    case 'prose': {
      prompt.system = systemPrompts.prose;
      prompt.user = buildProseUserPrompt({
        rawUserPrompt,
        manifestMarkdown,
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
