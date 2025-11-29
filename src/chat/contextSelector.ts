// src/chat/contextSelector.ts
import OpenAI from 'openai';

export type ContextNeeds = {
  needsBrief: boolean;
  needsOutline: boolean;
};

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
      'brief', 'briefen', 'premiss', 'koncept', 'tema', 'ton', 'stil',
      'genre', 'målgrupp', 'sammanfattning', 'elevator pitch',
      'vad handlar', 'övergripande', 'helhet',
      'huvudidé', 'grundidé', 'kärnidé', 'berättelseidé'
    ],
    outline: [
      'outline', 'outlinen', 'plot', 'plott', 'struktur', 'disposition', 'sekvens',
      'kapitel', 'akt', 'tidslinje', 'berättarbåge',
      'progression', 'vad händer', 'flöde', 'handlingen',
      'händelseförlopp', 'kronologi', 'berättelsegång'
    ],
  },
  en: {
    brief: [
      'premise', 'concept', 'theme', 'tone', 'style',
      'genre', 'audience', 'summary', 'elevator pitch',
      'what is this about', 'overall story', 'main idea'
    ],
    outline: [
      'plot', 'structure', 'outline', 'sequence',
      'chapter', 'act', 'timeline', 'story arc',
      'progression', 'what happens', 'flow'
    ],
  }
};

/**
 * Fast keyword-based heuristic to determine context needs
 */
function quickHeuristicCheck(userPrompt: string, language: 'sv' | 'en' = 'sv'): HeuristicResult {
  const lowerPrompt = userPrompt.toLowerCase();
  const keywords = CONTEXT_KEYWORDS[language];

  // Check for explicit mentions of document names (high confidence)
  const explicitBrief = lowerPrompt.includes('brief');
  const explicitOutline = lowerPrompt.includes('outline') || lowerPrompt.includes('outlinen');

  // Count matches for each context type
  const briefMatches = keywords.brief.filter(kw => lowerPrompt.includes(kw)).length;
  const outlineMatches = keywords.outline.filter(kw => lowerPrompt.includes(kw)).length;

  const totalMatches = briefMatches + outlineMatches;

  // Confidence based on number of matches
  // Explicit mentions of document names get high confidence
  let confidence = 0;
  if (explicitBrief || explicitOutline) {
    confidence = 0.9; // Very high confidence when explicitly mentioned
  } else if (totalMatches >= 3) {
    confidence = 0.9;
  } else if (totalMatches === 2) {
    confidence = 0.7;
  } else if (totalMatches === 1) {
    confidence = 0.5;
  } else {
    confidence = 0.2;
  }

  return {
    needsBrief: briefMatches > 0,
    needsOutline: outlineMatches > 0,
    confidence
  };
}

/**
 * System prompt used for LLM context classification
 * Exported for testing and debugging purposes
 */
export const LLM_CONTEXT_CLASSIFICATION_PROMPT = `# Role and Objective
- Assess whether a user’s writing question would be better answered with access to the story’s Brief and/or Outline. Your goal is to guide prompt construction for API calls so the assistant receives the context it needs to respond effectively.

# Instructions
- Begin with a concise checklist (3-7 conceptual steps) outlining your evaluation process before you proceed; keep items high-level, not implementation-specific.
- DDetermine whether each context type would meaningfully improve the assistant’s ability to answer the user’s question.
- Use these criteria:
  - **Brief**: needed when understanding the story’s premise, themes, tone, or main character concepts would influence or improve the response.
  - **Outline**: needed when understanding plot structure, narrative order, character arcs, or planned story events would influence or improve the response.
- Treat requests for scenes, chapters, continuations, rewrites, or expansions as implicitly dependent on story structure, and therefore usually requiring the Outline (and often the Brief).
- When a question is vague but clearly refers to story content (e.g., “skriv första scenen”, “fortsätt berättelsen”), interpret it as needing both Brief and Outline.
- Only return false for a context type when the question can be answered just as well without that information.
- If the question is completely generic and unrelated to a specific story, set both fields to false.
- After generating your response, validate that only the specified JSON object appears in the output.

# Context Definitions

## Brief
Includes:
- Core idea or concept
- Central premise
- Themes
- Tone
- Main character concepts

Use when these elements shape how the requested writing should be executed.

## Outline
Includes:
- Plot structure and sequence of events
- Character arcs and motivations
- Relationships and conflicts
- Turning points, reveals, resolution plans
- Scene/sequence ordering

Use when the user’s request depends on what has happened, or will happen, in the story.

# Output Format
Respond only with this JSON object:

\`\`\`json
{
  "needsBrief": boolean,   // true only if story brief is necessary
  "needsOutline": boolean  // true only if story outline is necessary
}
\`\`\`

# Verbosity
- The output must strictly consist of the JSON object as specified
— No additional content.

# Verification & Stop Condition
- After generating your output, confirm strict schema adherence. Complete the task upon producing a correctly formatted JSON object.`;

/**
 * Use LLM to intelligently classify context needs
 */
async function llmClassification(
  userPrompt: string,
  apiKey: string
): Promise<ContextNeeds> {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: LLM_CONTEXT_CLASSIFICATION_PROMPT
      }, {
        role: "user",
        content: userPrompt
      }],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 50
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      needsBrief: result.needsBrief || false,
      needsOutline: result.needsOutline || false
    };
  } catch (error) {
    console.error('LLM classification failed:', error);
    // Fallback to not including any context on error
    return { needsBrief: false, needsOutline: false };
  }
}

/**
 * Hybrid approach: Fast heuristics with optional intelligent classification
 *
 * @param userPrompt - The user's question/prompt
 * @param useIntelligent - Whether to use LLM classification for ambiguous cases
 * @param apiKey - OpenAI API key (required if useIntelligent is true)
 * @param language - Language of the prompt ('sv' for Swedish, 'en' for English)
 */
export async function determineContextNeeds(
  userPrompt: string,
  options: {
    useIntelligent?: boolean;
    apiKey?: string;
    language?: 'sv' | 'en';
  } = {}
): Promise<ContextNeeds> {
  const { useIntelligent = false, apiKey, language = 'sv' } = options;

  // Fast keyword check for obvious cases
  const heuristic = quickHeuristicCheck(userPrompt, language);

  // If very clear from keywords, use that
  if (heuristic.confidence >= 0.7) {
    return {
      needsBrief: heuristic.needsBrief,
      needsOutline: heuristic.needsOutline
    };
  }

  // For ambiguous cases, optionally use LLM
  if (useIntelligent && apiKey) {
    return await llmClassification(userPrompt, apiKey);
  }

  // Default for ambiguous cases without intelligent mode:
  // Include nothing (conservative approach to save tokens)
  return { needsBrief: false, needsOutline: false };
}
