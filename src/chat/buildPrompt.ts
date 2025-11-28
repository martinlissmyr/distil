// src/chat/buildPrompt.ts
import { useAppStore, metaId } from '../state/useAppStore';
import type { EditorKind, QuestionScope } from '../types/chat';
import {
  systemPrompts,
  defaultSystemPrompt,
  buildAssistantContext,
  buildProseUserPrompt,
} from './prompts/buildFromTemplates';
import { determineContextNeeds } from './contextSelector';

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
  useIntelligentContext?: boolean;
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
  useIntelligentContext = false,
  apiKey,
  language = 'sv',
}: BuildPromptArgs): Promise<BuiltPrompt> {
  const state = useAppStore.getState();

  // Collect available context documents
  const includedContexts: string[] = [];
  const contextDocs: Array<{ label: string; content: string }> = [];

  // Look up manifest (always check, included for all kinds)
  const manifestId = metaId({ kind: 'root' } as const, 'manifest');
  const manifestState = state.metaDocs[manifestId];
  const manifestMarkdown = manifestState?.markdown ?? null;

  if (manifestMarkdown) {
    includedContexts.push('manifest');
    contextDocs.push({
      label: 'AUTHOR MANIFEST (style/tone)',
      content: manifestMarkdown
    });
  }

  // Determine if we need brief/outline context (only for prose)
  if (projectId && storyId && kind === 'prose') {
    const contextNeeds = await determineContextNeeds(rawUserPrompt, {
      useIntelligent: useIntelligentContext,
      apiKey,
      language,
    });

    // Load brief if needed
    if (contextNeeds.needsBrief) {
      const briefId = metaId({ kind: 'story', projectId, storyId }, 'brief');
      const briefState = state.metaDocs[briefId];
      const briefMarkdown = briefState?.markdown ?? null;

      if (briefMarkdown) {
        includedContexts.push('brief');
        contextDocs.push({
          label: 'STORY BRIEF (high-level concept)',
          content: briefMarkdown
        });
      }
    }

    // Load outline if needed
    if (contextNeeds.needsOutline) {
      const outlineId = metaId({ kind: 'story', projectId, storyId }, 'outline');
      const outlineState = state.metaDocs[outlineId];
      const outlineMarkdown = outlineState?.markdown ?? null;

      if (outlineMarkdown) {
        includedContexts.push('outline');
        contextDocs.push({
          label: 'STORY OUTLINE (structure/plot)',
          content: outlineMarkdown
        });
      }
    }
  }

  // Build context documents markdown string
  const contextDocumentsMarkdown = contextDocs.map(doc =>
    `\n${doc.label}:\n---\n${doc.content}\n\n---`
  ).join('');

  // Build context summary for user prompt with descriptive labels
  const contextSummaryItems: string[] = [];

  // Add context documents with user-friendly descriptions
  if (manifestMarkdown) {
    contextSummaryItems.push('- An author manifest (style/tone)');
  }
  if (includedContexts.includes('brief')) {
    contextSummaryItems.push('- A story brief (high-level concept)');
  }
  if (includedContexts.includes('outline')) {
    contextSummaryItems.push('- A story outline (structure/plot)');
  }

  // Add full text if present
  if (fullTextMarkdown) {
    contextSummaryItems.push('- The full text of the piece (may be partial)');
  }

  // Add snippet if there's a selection
  if (scope === 'selection' && selectionMarkdown) {
    contextSummaryItems.push('- A snippet (current selection)');
  }

  const contextSummary = contextSummaryItems.length > 0
    ? `You've been given:\n${contextSummaryItems.join('\n')}`
    : '';

  const prompt: BuiltPrompt = {
    system: '',
    assistant: '',
    user: '',
    includedContexts,
  };

  // Build assistant context (shared across all editor kinds)
  prompt.assistant = buildAssistantContext({
    title,
    fullTextMarkdown,
    contextDocumentsMarkdown,
    selectionMarkdown,
    scope,
  });

  // Build system and user prompts per editor kind
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
