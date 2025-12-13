// src/chat/contextSelector.ts
import OpenAI from 'openai';
import { useAppStore, metaId } from '../state/useAppStore';
import type { EditorKind } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import type { SupportedLanguage } from '../types/language';
import {
  getContextRulesFor,
  getDocContextLabel,
  getKeywordsForDocKind,
  getContextCriteriaLine,
  getContextDefinitionBlock,
  assertContextGuidanceAvailable,
} from '../docs';
import contextClassificationPromptMd from './prompts/contextClassificationPrompt.md?raw';
import { interpolate } from '../helpers/interpolate';

// -------------------------------------------------------------
// Load & assemble context docs
// -------------------------------------------------------------

export async function getContextDocs(
  kind: EditorKind,
  rawUserPrompt: string,
  projectId?: string,
  storyId?: string,
  options: {
    apiKey?: string;
    language?: SupportedLanguage;
  } = {}
) {
  const { apiKey, language = 'sv' } = options;

  const state = useAppStore.getState();

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

  const contexts: {
    kinds: MetaDocKey[];
    docs: { label: string; content: string }[];
    markdown: string;
  } = {
    kinds: [],
    docs: [],
    markdown: '',
  };

  const rules = getContextRulesFor(kind);

  // 1. Always include
  for (const docKey of rules.alwaysInclude) {
    const markdown = loadMetaDoc(docKey);
    contexts.kinds.push(docKey);
    if (markdown) {
      contexts.docs.push({
        label: getDocContextLabel(docKey),
        content: markdown,
      });
    }
  }

  // 2. Intelligent selection
  if (rules.intelligentlySelect.length > 0) {
    const { relevantContexts } = await determineContextNeeds(
      rawUserPrompt,
      rules.intelligentlySelect,
      { apiKey, language }
    );

    for (const docKey of relevantContexts) {
      contexts.kinds.push(docKey);
      const markdown = loadMetaDoc(docKey);
      if (markdown) {
        contexts.docs.push({
          label: getDocContextLabel(docKey),
          content: markdown,
        });
      }
    }
  }

  contexts.markdown = contexts.docs
    .map(
      (doc) => `\n${doc.label}:\n---\n${doc.content}\n\n---`
    )
    .join('');

  return contexts;
}

// -------------------------------------------------------------
// Heuristics
// -------------------------------------------------------------

export type ContextNeeds = {
  needsBrief: boolean;
  needsOutline: boolean;
  needsWorld: boolean;
};

// For compatibility; not really used directly any more, but harmless:
type HeuristicResult = ContextNeeds & {
  confidence: number; // 0-1, how confident we are in this result
};

type ContextKind = MetaDocKey;

export type HeuristicCheckResult = {
  kind: ContextKind;
  confidence: number;
};

export function quickHeuristicCheck(
  userPrompt: string,
  kinds: ContextKind[],
  language: SupportedLanguage = 'sv'
): HeuristicCheckResult[] {
  const lowerPrompt = userPrompt.toLowerCase();

  const heuristicCheckResults: HeuristicCheckResult[] = [];

  for (const docKey of kinds) {
    let confidence = 0;

    // Strong hint: kind name itself appears
    if (lowerPrompt.includes(docKey)) {
      confidence = 0.9;
    } else {
      const keywords = getKeywordsForDocKind(language, docKey);
      const matches = keywords.filter((kw) => lowerPrompt.includes(kw)).length;

      if (matches >= 3) {
        confidence = 0.9;
      } else if (matches === 2) {
        confidence = 0.8;
      } else if (matches === 1) {
        confidence = 0.7;
      }
    }

    heuristicCheckResults.push({ kind: docKey, confidence });
  }

  return heuristicCheckResults;
}

export const isAboveConfidenceThreshold = (confidence: number) =>
  confidence >= 0.7;

// -------------------------------------------------------------
// LLM classification prompt
// -------------------------------------------------------------

/**
 * System prompt used for LLM context classification
 * Exported for testing and debugging purposes via buildPrompt().
 */
export function buildPrompt(ambiguousNeededContexts: MetaDocKey[]): string {
  if (ambiguousNeededContexts.length === 0) {
    throw new Error(
      'buildPrompt was called with no ambiguous contexts. Did you mean to skip LLM classification?'
    );
  }

  // Validate all doc kinds have context guidance in the model
  for (const key of ambiguousNeededContexts) {
    assertContextGuidanceAvailable(key);
  }

  const keysToDescribe = ambiguousNeededContexts;

  // 1. Build criteria block from doc model
  const criteriaBlock = keysToDescribe
    .map((key) => getContextCriteriaLine(key))
    .filter((line): line is string => Boolean(line))
    .join('\n');

  // 2. Build context definition blocks from doc model
  const definitionsBlock = keysToDescribe
    .map((key) => getContextDefinitionBlock(key))
    .filter((block): block is string => Boolean(block))
    .join('\n\n');

  // 3. Build JSON field lines
  const jsonFields = keysToDescribe
    .map(
      (key) =>
        `  "${key}": boolean, // true only if story ${key} document is necessary`
    )
    .join('\n');

  // 4. Interpolate into the markdown template
  const prompt = interpolate(contextClassificationPromptMd, {
    criteriaBlock,
    definitionsBlock,
    jsonFields,
  });

  return prompt;
}

// -------------------------------------------------------------
// LLM-based refinement
// -------------------------------------------------------------

export type LlmContextResult = {
  relevantContexts: MetaDocKey[];
  result: Record<string, any> | null; // raw LLM JSON for testing
};

export async function determineContextNeedsWithLLMClassification(
  userPrompt: string,
  relevantContexts: MetaDocKey[],
  ambiguousNeededContexts: MetaDocKey[],
  apiKey?: string
): Promise<LlmContextResult> {
  if (!apiKey) {
    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      result: null,
    };
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const contextClassificationPrompt = buildPrompt(ambiguousNeededContexts);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: contextClassificationPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 50,
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(raw) as Record<string, any>;

    for (const key of ambiguousNeededContexts) {
      const v = result[key];
      if (v === true || v === 'true' || v === 1) {
        relevantContexts.push(key);
      }
    }

    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      result,
    };
  } catch (error) {
    console.error('LLM classification failed:', error);
    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      result: null,
    };
  }
}

// -------------------------------------------------------------
// Hybrid: heuristics + LLM
// -------------------------------------------------------------

export type ContextNeedsResult = {
  relevantContexts: MetaDocKey[];
  result: Record<string, any> | null; // null when only heuristics used
};

export async function determineContextNeeds(
  userPrompt: string,
  kinds: MetaDocKey[],
  options: {
    apiKey?: string;
    language?: SupportedLanguage;
  } = {}
): Promise<ContextNeedsResult> {
  const { apiKey, language = 'sv' } = options;

  const relevantContexts: MetaDocKey[] = [];
  const ambiguousNeededContexts: MetaDocKey[] = [];

  // Fast keyword check for obvious cases
  const heuristicCheckResults = quickHeuristicCheck(userPrompt, kinds, language);

  for (const { kind, confidence } of heuristicCheckResults) {
    if (isAboveConfidenceThreshold(confidence)) {
      relevantContexts.push(kind);
    } else {
      ambiguousNeededContexts.push(kind);
    }
  }

  // If nothing ambiguous, we’re done – heuristics only
  if (ambiguousNeededContexts.length === 0) {
    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      result: null,
    };
  }

  // Otherwise, let LLM refine ambiguous ones
  return await determineContextNeedsWithLLMClassification(
    userPrompt,
    Array.from(new Set(relevantContexts)),
    ambiguousNeededContexts,
    apiKey
  );
}