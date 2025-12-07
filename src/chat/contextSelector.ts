// src/chat/contextSelector.ts
import OpenAI from 'openai';

export type ContextNeeds = {
  needsBrief: boolean;
  needsOutline: boolean;
  needsWorld: boolean;
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
    world: [
      'world', 'världen', 'värld', 'miljö', 'setting', 'tidsperiod', 'epok',
      'plats', 'platser', 'geografi', 'samhälle', 'kultur',
      'världsbygge', 'worldbuilding', 'regler', 'lagar', 'fysik',
      'fantastisk', 'sci-fi', 'historisk kontext', 'tid och rum'
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
    world: [
      'world', 'setting', 'time period', 'era', 'epoch',
      'place', 'places', 'location', 'geography', 'society', 'culture',
      'worldbuilding', 'world building', 'rules', 'laws', 'physics',
      'fantasy', 'sci-fi', 'historical context', 'time and space'
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
  const explicitWorld = lowerPrompt.includes('world') || lowerPrompt.includes('världen');

  // Count matches for each context type
  const briefMatches = keywords.brief.filter(kw => lowerPrompt.includes(kw)).length;
  const outlineMatches = keywords.outline.filter(kw => lowerPrompt.includes(kw)).length;
  const worldMatches = keywords.world.filter(kw => lowerPrompt.includes(kw)).length;

  const totalMatches = briefMatches + outlineMatches + worldMatches;

  // Confidence based on number of matches
  // Explicit mentions of document names get high confidence
  let confidence = 0;
  if (explicitBrief || explicitOutline || explicitWorld) {
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
    needsWorld: worldMatches > 0,
    confidence
  };
}

/**
 * System prompt used for LLM context classification
 * Exported for testing and debugging purposes
 */
export const LLM_CONTEXT_CLASSIFICATION_PROMPT = `Developer: # Role and Objective
- Evaluate whether a user's writing question should be answered using the story's Brief, Outline, and/or World. Your objective is to guide prompt construction for API calls so that the assistant gains the necessary context for an effective response.

# Instructions
- Begin with a concise checklist (3–7 bullets) of conceptual evaluation steps before proceeding.
- Assess, for each context type, whether it would meaningfully enhance the assistant’s ability to answer the user’s question.
- Apply the following criteria:
  - **Brief**: Required if understanding the story’s core idea, themes, tone, or principal character concepts would inform or improve the answer.
  - **Outline**: Required if knowledge of the plot structure, narrative flow, character arcs, or story events is needed to influence or enhance the response.
  - **World**: Required if familiarity with the setting, period, world-building details, rules, geography, culture, or historical background is essential for completing the request.
- Automatically assume that requests for scenes, chapters, continuations, rewrites, or expansions rely on the story’s structure, and thus usually require the Outline (and often the Brief).
- If a question is vague but clearly references story content (e.g., "skriv första scenen," "fortsätt berättelsen"), interpret it as requiring the relevant context documents.
- Only set a context field to false if the question can be fully and effectively answered without that information.
- For questions that are entirely generic and not linked to any story, set all context fields to false.
Before generating output, set reasoning_effort = minimal; proceed efficiently but ensure all relevant checks are performed.
- Upon generating your answer, ensure that your response contains only the specified JSON object format and validate strict adherence to the output schema. If the schema is not met, self-correct and regenerate.

# Context Definitions

## Brief
Includes:
- Core idea/concept
- Central premise
- Themes
- Tone
- Main character concepts

Use when these qualities would shape the requested writing style or substance.

## Outline
Includes:
- Plot structure and event sequence
- Character arcs and motivations
- Relationships/conflicts
- Turning points, reveals, and resolutions
- Scene/sequence order

Use when context involving story events—past or future—is necessary.

## World
Includes:
- Setting/location details
- Time period/historical background
- World-building/rules
- Geography/environment
- Culture/society
- Fantasy/sci-fi aspects

Use when the request calls for a detailed depiction of locations, eras, or world-specific characteristics.

# Output Format
Respond strictly with the following JSON schema:

\`\`\`json
{
  "needsBrief": boolean,   // true only if the story brief is necessary
  "needsOutline": boolean, // true only if the story outline is necessary
  "needsWorld": boolean    // true only if world-building information is necessary
}
\`\`\`

# Verbosity
- Output must exclusively consist of the specified JSON object—no extra content.

# Verification & Stop Condition
- After generating output, confirm strict adherence to the schema. If validation fails, self-correct and regenerate. Finish the task upon correct JSON object generation.`;

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
      needsOutline: result.needsOutline || false,
      needsWorld: result.needsWorld || false
    };
  } catch (error) {
    console.error('LLM classification failed:', error);
    // Fallback to not including any context on error
    return { needsBrief: false, needsOutline: false, needsWorld: false };
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
      needsOutline: heuristic.needsOutline,
      needsWorld: heuristic.needsWorld
    };
  }

  // For ambiguous cases, optionally use LLM
  if (useIntelligent && apiKey) {
    return await llmClassification(userPrompt, apiKey);
  }

  // Default for ambiguous cases without intelligent mode:
  // Include nothing (conservative approach to save tokens)
  return { needsBrief: false, needsOutline: false, needsWorld: false };
}
