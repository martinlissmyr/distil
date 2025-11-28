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
 * Use LLM to intelligently classify context needs
 */
async function llmClassification(
  userPrompt: string,
  apiKey: string
): Promise<ContextNeeds> {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const systemPrompt = `# Role and Objective
- Assess whether a user writing question requires specific story context types (brief or outline) to be answered thoroughly. This assessment supports prompt construction for API calls.

# Instructions
- Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level.
- Determine if the writing question requires story context documents for an effective answer.
- Evaluate for the following context types:
  - Brief: High-level premise, themes, tone, character concepts
  - Outline: Plot structure, story progression, scene sequences
- Only return true for a context type if it is NECESSARY to answer well.
- After producing the output, validate that only the specified JSON object is included, with no additional text or explanations. If not, self-correct.

# Example User Prompt
- Example: "Hur står den här texten sig i förhållande till min idé?"

# Output Format
- Respond ONLY with a JSON object in the format below (no explanations or extra fields):
\`\`\`json
{
  "needsBrief": boolean,   // true only if story brief context is necessary
  "needsOutline": boolean  // true only if story outline context is necessary
}
\`\`\`
- Output both fields in the order: needsBrief, needsOutline.
- If the writing question is ambiguous or missing information for a clear answer, return false for both fields.
- Do NOT include other fields or explanations in the response.

# Verbosity
- Output should be strictly limited to the requested JSON object.

# Stop Conditions
- Stop when the JSON object meeting the above specifications is produced.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: systemPrompt
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
