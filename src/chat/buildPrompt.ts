// src/chat/buildPrompt.ts
import { useAppStore, metaId } from '../state/useAppStore';
import type { EditorKind, QuestionScope } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import {
  systemPrompts,
  defaultSystemPrompt,
  buildAssistantContext,
  buildProseUserPrompt,
} from './prompts/buildFromTemplates';
import { determineContextNeeds } from './contextSelector';
import { getContextRules } from './contextRules';

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

  // Get context rules for this editor kind
  const rules = getContextRules(kind);

  // Collect available context documents
  const includedContexts: string[] = [];
  const contextDocs: Array<{ label: string; content: string }> = [];

  // Helper to get document labels
  const getDocLabel = (docKey: MetaDocKey): string => {
    switch (docKey) {
      case 'manifest': return 'AUTHOR MANIFEST (style/tone)';
      case 'brief': return 'STORY BRIEF (high-level concept)';
      case 'outline': return 'STORY OUTLINE (structure/plot)';
      case 'world': return 'WORLD (setting/worldbuilding)';
      default: return docKey.toUpperCase();
    }
  };

  // Helper to load a metaDoc
  const loadMetaDoc = (docKey: MetaDocKey): string | null => {
    if (docKey === 'manifest') {
      const manifestId = metaId({ kind: 'root' } as const, 'manifest');
      return state.metaDocs[manifestId]?.markdown ?? null;
    } else if (projectId && storyId) {
      const docId = metaId({ kind: 'story', projectId, storyId }, docKey);
      return state.metaDocs[docId]?.markdown ?? null;
    }
    return null;
  };

  // 1. Always include documents (no intelligence needed)
  for (const docKey of rules.alwaysInclude) {
    const markdown = loadMetaDoc(docKey);
    if (markdown) {
      includedContexts.push(docKey);
      contextDocs.push({
        label: getDocLabel(docKey),
        content: markdown
      });
    }
  }

  // 2. Intelligently select documents (use LLM/heuristic)
  if (rules.intelligentlySelect.length > 0 && projectId && storyId) {
    const contextNeeds = await determineContextNeeds(rawUserPrompt, {
      useIntelligent: useIntelligentContext,
      apiKey,
      language,
    });

    // Check each document in intelligentlySelect list
    for (const docKey of rules.intelligentlySelect) {
      let shouldInclude = false;

      // Map docKey to contextNeeds properties
      if (docKey === 'brief' && contextNeeds.needsBrief) {
        shouldInclude = true;
      } else if (docKey === 'outline' && contextNeeds.needsOutline) {
        shouldInclude = true;
      } else if (docKey === 'world' && contextNeeds.needsWorld) {
        shouldInclude = true;
      }
      // Future: Add checks for 'characters', 'places', etc.

      if (shouldInclude) {
        const markdown = loadMetaDoc(docKey);
        if (markdown) {
          includedContexts.push(docKey);
          contextDocs.push({
            label: getDocLabel(docKey),
            content: markdown
          });
        }
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
  const contextDescriptions: Record<MetaDocKey, string> = {
    manifest: '- An author manifest (style/tone)',
    brief: '- A story brief (high-level concept)',
    outline: '- A story outline (structure/plot)',
    world: '- World information (setting/worldbuilding)',
  };

  for (const docKey of includedContexts) {
    if (docKey in contextDescriptions) {
      contextSummaryItems.push(contextDescriptions[docKey as MetaDocKey]);
    }
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
