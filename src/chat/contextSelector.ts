// src/chat/contextSelector.ts
import OpenAI from 'openai';
import { useAppStore, metaId } from '../state/useAppStore';
import type { EditorKind } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';

export type ContextNeeds = {
  needsBrief: boolean;
  needsOutline: boolean;
  needsWorld: boolean;
};

export type ContextRules = {
  alwaysInclude: MetaDocKey[];
  intelligentlySelect: MetaDocKey[];
};

export const CONTEXT_RULES: Record<EditorKind, ContextRules> = {
  prose: {
    alwaysInclude: ['manifest'],
    intelligentlySelect: ['brief', 'outline', 'world'],
  },
  brief: {
    alwaysInclude: ['manifest'],
    intelligentlySelect: [],
  },
  outline: {
    alwaysInclude: ['manifest', 'brief'],
    intelligentlySelect: [],
  },
  world: {
    alwaysInclude: ['manifest', 'brief'],
    intelligentlySelect: [],
  },
  manifest: {
    alwaysInclude: [],
    intelligentlySelect: [],
  },
};

export async function getContextDocs(
  kind: EditorKind,
  rawUserPrompt: string,
  projectId?: string,
  storyId?: string,
  options: {
    apiKey?: string;
    language?: 'sv' | 'en';
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

  const getDocLabel = (docKey: MetaDocKey): string => {
    switch (docKey) {
      case 'manifest':
        return 'AUTHOR MANIFEST (style/tone)';
      case 'brief':
        return 'STORY BRIEF (high-level concept)';
      case 'outline':
        return 'STORY OUTLINE (structure/plot)';
      case 'world':
        return 'WORLD (setting/worldbuilding)';
      default:
        return docKey.toUpperCase();
    }
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

  const rules = CONTEXT_RULES[kind];

  // 1. Always include
  for (const docKey of rules.alwaysInclude) {
    const markdown = loadMetaDoc(docKey);
    contexts.kinds.push(docKey);
    if (markdown) {
      contexts.docs.push({
        label: getDocLabel(docKey),
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
          label: getDocLabel(docKey),
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

type HeuristicResult = ContextNeeds & {
  confidence: number; // 0-1, how confident we are in this result
};

/**
 * Keywords that suggest the user needs context documents
 * Organized by language for easy expansion
 */
const CONTEXT_KEYWORDS = {
  sv: {
    brief: [
      'brief', 'premiss', 'koncept', 'tema', 'ton', 'stil',
      'genre', 'målgrupp', 'sammanfattning',
      'handlar', 'övergripande', 'helhet',
      'huvudidé', 'idé', 'grundidé', 'kärnidé', 'berättelseidé'
    ],
    outline: [
      'outline', 'plot', 'plott', 'struktur', 'disposition', 'sekvens',
      'kapitel', 'akt', 'tidslinje', 'berättarbåge',
      'progression', 'händer', 'flöde', 'handling',
      'händelseförlopp', 'kronologi', 'berättelse'
    ],
    world: [
      'world', 'världen', 'värld', 'miljö', 'setting', 'tidsperiod', 'epok',
      'plats', 'platser', 'geografi', 'samhälle', 'kultur',
      'världsbygge', 'worldbuilding', 'regler', 'lagar', 'fysik',
      'historisk', 'kontext', 'tid', 'rum'
    ],
  },
  en: {
    brief: [
      'premise', 'concept', 'theme', 'tone', 'style',
      'genre', 'audience', 'summary', 'pitch',
      'about', 'story', 'idea'
    ],
    outline: [
      'plot', 'structure', 'outline', 'sequence',
      'chapter', 'act', 'timeline', 'story arc',
      'progression', 'what happens', 'flow'
    ],
    world: [
      'world', 'setting', 'time period', 'era', 'epoch',
      'place', 'places', 'location', 'geography', 'society', 'culture',
      'worldbuilding', 'world building', 'rules', 'laws', 'physics',
      'historical', 'context', 'time', 'space'
    ],
  }
};

/**
 * Fast keyword-based heuristic to determine context needs
 */
type ContextKind = MetaDocKey;

export type HeuristicCheckResult = {
  kind: ContextKind;
  confidence: number;
};

export function quickHeuristicCheck(
  userPrompt: string,
  kinds: ContextKind[],
  language: 'sv' | 'en' = 'sv'
): HeuristicCheckResult[] {
  const lowerPrompt = userPrompt.toLowerCase();
  const keywords = CONTEXT_KEYWORDS[language];

  const heuristicCheckResults: HeuristicCheckResult[] = [];

  for (const docKey of kinds) {
    let confidence = 0;

    if (lowerPrompt.includes(docKey)) {
      confidence = 0.9;
    } else {
      const list = keywords[docKey as keyof typeof keywords] ?? [];
      const matches = list.filter((kw) => lowerPrompt.includes(kw)).length;

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

/**
 * System prompt used for LLM context classification
 * Exported for testing and debugging purposes
 */
const LLM_CONTEXT_CLASSIFICATION_PROMPT_START = `# Role and Objective
- Evaluate whether a user's writing question should be answered using the story's Brief, Outline, and/or World. Your objective is to guide prompt construction for API calls so that the assistant gains the necessary context for an effective response.

# Instructions
- Begin with a concise checklist (3–7 bullets) of conceptual evaluation steps before proceeding.
- Assess, for each context type, whether it would meaningfully enhance the assistant’s ability to answer the user’s question.
- Apply the following criteria:
`;

const LLM_CONTEXT_CLASSIFICATION_PROMPT_INSTRUCTIONS_CONTD = `
- Automatically assume that requests for scenes, chapters, continuations, rewrites, or expansions rely on the story’s structure, and thus usually require the Outline (and often the Brief).
- If a question is vague but clearly references story content (e.g., "skriv första scenen," "fortsätt berättelsen"), interpret it as requiring the relevant context documents.
- Only set a context field to false if the question can be fully and effectively answered without that information.
- For questions that are entirely generic and not linked to any story, set all context fields to false.
Before generating output, set reasoning_effort = minimal; proceed efficiently but ensure all relevant checks are performed.
- Upon generating your answer, ensure that your response contains only the specified JSON object format and validate strict adherence to the output schema. If the schema is not met, self-correct and regenerate.

# Context Definitions

`;

const criteriaDefinitions = {
  "brief": `  - **brief**: Required if understanding the story’s core idea, themes, tone, or principal character concepts would inform or improve the answer.`,
  "outline": `  - **outline**: Required if knowledge of the plot structure, narrative flow, character arcs, or story events is needed to influence or enhance the response.`,
  "world": `  - **world**: Required if familiarity with the setting, period, world-building details, rules, geography, culture, or historical background is essential for completing the request.`,
};

const docDefinitions = {
  "brief": `## Brief
Includes:
- Core idea/concept
- Central premise
- Themes
- Tone
- Main character concepts

Use when these qualities would shape the requested writing style or substance`,
  "outline": `## Outline
Includes:
- Plot structure and event sequence
- Character arcs and motivations
- Relationships/conflicts
- Turning points, reveals, and resolutions
- Scene/sequence order

Use when context involving story events—past or future—is necessary.`,
  "world": `## World
Includes:
- Setting/location details
- Time period/historical background
- World-building/rules
- Geography/environment
- Culture/society
- What is canonical, relevant, suitable or natural for a specific time period, location etc.

Use when the request calls for a detailed depiction of locations, eras, or world-specific characteristics.`
};

const LLM_CONTEXT_CLASSIFICATION_PROMPT_OUTPUT_FORMAT_START = `# Output Format
Respond strictly with the following JSON schema:

\`\`\`json
{`;

const LLM_CONTEXT_CLASSIFICATION_PROMPT_OUTPUT_FORMAT_END = `
}
\`\`\`
`;

const LLM_CONTEXT_CLASSIFICATION_PROMPT_OUTPUT_END = `
# Verbosity
- Output must exclusively consist of the specified JSON object — no extra content.

# Verification & Stop Condition
- After generating output, confirm strict adherence to the schema. If validation fails, self-correct and regenerate. Finish the task upon correct JSON object generation.
`;

export function buildPrompt(ambiguousNeededContexts: MetaDocKey[]): string {
  // We only have definitions for these three, so ignore others (e.g. 'manifest')
  const activeKeys = ambiguousNeededContexts.filter(
    (key) => key === 'brief' || key === 'outline' || key === 'world'
  );

  // If somehow nothing matches, just fall back to the generic prompt start + all definitions
  const keysToDescribe = activeKeys.length > 0 ? activeKeys : (['brief', 'outline', 'world'] as MetaDocKey[]);

  // 1. Start with the main instruction block
  let prompt = LLM_CONTEXT_CLASSIFICATION_PROMPT_START;

  // 2. Append the relevant context criteria
  prompt += keysToDescribe
    .map((key) => criteriaDefinitions[key])
    .join('\n');

  // 3. 
  prompt += LLM_CONTEXT_CLASSIFICATION_PROMPT_INSTRUCTIONS_CONTD;

  // 4. Append the relevant context definitions
  prompt += keysToDescribe
    .map((key) => docDefinitions[key])
    .join('\n\n');

  // 5. Add the output format header
  prompt += '\n\n' + LLM_CONTEXT_CLASSIFICATION_PROMPT_OUTPUT_FORMAT_START + '\n';

  // 6. Build one JSON field row per ambiguous context
  //    Example:
  //    "brief": boolean, // true only if story brief document is necessary
  const fieldLines = keysToDescribe.map(
    (key) =>
      `  "${key}": boolean, // true only if story ${key} document is necessary`
  );

  prompt += fieldLines.join('\n');

  // 6. Close the ```json block and append the final instructions
  prompt += LLM_CONTEXT_CLASSIFICATION_PROMPT_OUTPUT_FORMAT_END;
  prompt += LLM_CONTEXT_CLASSIFICATION_PROMPT_OUTPUT_END;

  return prompt;
}

/**
 * Use LLM to intelligently classify context needs
 */
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

/**
 * Hybrid approach: Fast heuristics with optional intelligent classification
 */
export type ContextNeedsResult = {
  relevantContexts: MetaDocKey[];
  result: Record<string, any> | null; // null when only heuristics used
};

export async function determineContextNeeds(
  userPrompt: string,
  kinds: MetaDocKey[],
  options: {
    apiKey?: string;
    language?: 'sv' | 'en';
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

  // Otherwise, let LLM refine ambiguous ones (this returns { relevantContexts, result })
  return await determineContextNeedsWithLLMClassification(
    userPrompt,
    Array.from(new Set(relevantContexts)),
    ambiguousNeededContexts,
    apiKey
  );
}
