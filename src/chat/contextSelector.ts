// src/chat/contextSelector.ts
import { useAppStore, metaId } from '../state/useAppStore';
import type { EditorKind } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';
import { DEFAULT_WRITING_LANGUAGE } from '../types/language';
import type { WritingLanguage } from '../types/language';
import type { EntityType } from '../models/entities/entityIndex';
import {
  getContextRulesFor,
  getDocContextLabel,
  getKeywordsForDocKind,
  getContextCriteriaLine,
  getContextDefinitionBlock,
  assertContextGuidanceAvailable,
  isEntityIndexDoc,
  getDocKind,
} from '../models/docs';
import contextClassificationPromptMd from './prompts/contextClassificationPrompt.md?raw';
import entitySelectionPromptMd from './prompts/entitySelectionPrompt.md?raw';
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
    language?: WritingLanguage;
  } = {}
) {
  const { language = DEFAULT_WRITING_LANGUAGE } = options;

  const state = useAppStore.getState();

  const loadMetaDoc = (docKey: MetaDocKey): string | null => {
    if (docKey === 'manifest') {
      const manifestId = metaId({ scope: 'root' } as const, 'manifest');
      return state.metaDocs[manifestId]?.markdown ?? null;
    } else if (projectId && storyId) {
      const docId = metaId({ scope: 'story', projectId, storyId }, docKey);
      return state.metaDocs[docId]?.markdown ?? null;
    }
    return null;
  };

  const contexts: {
    kinds: MetaDocKey[];
    docs: { label: string; content: string }[];
    markdown: string;
    entities?: {
      characters?: { ids: string[]; depth: EntityDepth };
      locations?: { ids: string[]; depth: EntityDepth };
    };
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
    const { relevantContexts, entityDepths } = await determineContextNeeds(
      rawUserPrompt,
      rules.intelligentlySelect,
      { language }
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

    // 3. Entity selection (Phase 2)
    // For each entity type that was deemed relevant, select specific entities
    if (projectId && storyId && entityDepths.size > 0) {
      for (const [docKey, depth] of entityDepths.entries()) {
        if (docKey === 'characters') {
          const { selectedEntityIds } = await selectRelevantEntities(
            rawUserPrompt,
            projectId,
            storyId,
            'character'
          );
          if (selectedEntityIds.length > 0) {
            if (!contexts.entities) contexts.entities = {};
            contexts.entities.characters = { ids: selectedEntityIds, depth };
            // TODO: Load actual entity docs/projections and add to contexts.docs
          }
        } else if (docKey === 'locations') {
          const { selectedEntityIds } = await selectRelevantEntities(
            rawUserPrompt,
            projectId,
            storyId,
            'location'
          );
          if (selectedEntityIds.length > 0) {
            if (!contexts.entities) contexts.entities = {};
            contexts.entities.locations = { ids: selectedEntityIds, depth };
            // TODO: Load actual entity docs/projections and add to contexts.docs
          }
        }
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

type ContextKind = MetaDocKey;

export type HeuristicCheckResult = {
  kind: ContextKind;
  confidence: number;
};

export function quickHeuristicCheck(
  userPrompt: string,
  kinds: ContextKind[],
  language: WritingLanguage = 'sv'
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
    .map((key) => {
      const docKind = getDocKind(key);
      const baseField = `  "${key}": boolean, // true only if story ${key} document is necessary`;

      if (isEntityIndexDoc(docKind)) {
        const depthField = `  "${key}Depth": "projection" | "full", // "projection" for high-level/referential queries, "full" for deep psychology/motivations`;
        return `${baseField}\n${depthField}`;
      }

      return baseField;
    })
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

export type EntityDepth = 'projection' | 'full';

export type LlmContextResult = {
  relevantContexts: MetaDocKey[];
  entityDepths: Map<MetaDocKey, EntityDepth>; // depth for each entity type
  result: Record<string, any> | null; // raw LLM JSON for testing
};

export async function determineContextNeedsWithLLMClassification(
  userPrompt: string,
  relevantContexts: MetaDocKey[],
  ambiguousNeededContexts: MetaDocKey[]
): Promise<LlmContextResult> {
  const contextClassificationPrompt = buildPrompt(ambiguousNeededContexts);

  try {
    const response = await window.chat.send({
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
      model: 'gpt-4o-mini',
      temperature: 0,
      maxTokens: 50,
      responseFormat: 'json',
    });

    if (!response.ok) {
      console.error('LLM classification failed:', response.error);
      return {
        relevantContexts: Array.from(new Set(relevantContexts)),
        entityDepths: new Map(),
        result: null,
      };
    }

    const raw = response.data.output_text || '{}';
    const result = JSON.parse(raw) as Record<string, any>;

    const entityDepths = new Map<MetaDocKey, EntityDepth>();

    for (const key of ambiguousNeededContexts) {
      const v = result[key];
      if (v === true || v === 'true' || v === 1) {
        relevantContexts.push(key);
      }
    }

    // Extract depth fields for entity types
    for (const key of ambiguousNeededContexts) {
      const docKind = getDocKind(key);
      if (isEntityIndexDoc(docKind) && relevantContexts.includes(key)) {
        const depthKey = `${key}Depth`;
        const depthValue = result[depthKey];
        if (depthValue === 'projection' || depthValue === 'full') {
          entityDepths.set(key, depthValue);
        } else {
          // Default to 'projection' if depth not specified
          entityDepths.set(key, 'projection');
        }
      }
    }

    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      entityDepths,
      result,
    };
  } catch (error) {
    console.error('LLM classification failed:', error);
    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      entityDepths: new Map(),
      result: null,
    };
  }
}

// -------------------------------------------------------------
// Hybrid: heuristics + LLM
// -------------------------------------------------------------

export type ContextNeedsResult = {
  relevantContexts: MetaDocKey[];
  entityDepths: Map<MetaDocKey, EntityDepth>;
  result: Record<string, any> | null; // null when only heuristics used
};

export async function determineContextNeeds(
  userPrompt: string,
  kinds: MetaDocKey[],
  options: {
    language?: WritingLanguage;
  } = {}
): Promise<ContextNeedsResult> {
  const { language = DEFAULT_WRITING_LANGUAGE } = options;

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

  // Force entity types to LLM classification (need depth determination)
  // Move any entity index docs from relevantContexts to ambiguousNeededContexts
  for (let i = relevantContexts.length - 1; i >= 0; i--) {
    const kind = relevantContexts[i];
    const docKind = getDocKind(kind);
    if (isEntityIndexDoc(docKind)) {
      relevantContexts.splice(i, 1);
      if (!ambiguousNeededContexts.includes(kind)) {
        ambiguousNeededContexts.push(kind);
      }
    }
  }

  // If nothing ambiguous, we're done – heuristics only
  if (ambiguousNeededContexts.length === 0) {
    return {
      relevantContexts: Array.from(new Set(relevantContexts)),
      entityDepths: new Map(),
      result: null,
    };
  }

  // Otherwise, let LLM refine ambiguous ones
  return await determineContextNeedsWithLLMClassification(
    userPrompt,
    Array.from(new Set(relevantContexts)),
    ambiguousNeededContexts
  );
}

// -------------------------------------------------------------
// Phase 2: Entity selection
// -------------------------------------------------------------

/**
 * Loads entity indices and extracts projections for LLM selection.
 */
async function loadEntityProjections(
  projectId: string,
  storyId: string,
  entityType: EntityType
): Promise<{ id: string; projection: string }[]> {
  const response = await window.distil.loadEntityIndex(projectId, storyId, entityType);

  if (!response.ok || !response.data) {
    console.error(`Failed to load ${entityType} index:`, response.error);
    return [];
  }

  const index = response.data;
  return index.entities
    .filter(entry => entry.projection) // Only include entities with projections
    .map(entry => ({
      id: entry.id,
      projection: entry.projection!
    }));
}

export type EntitySelectionResult = {
  selectedEntityIds: string[];
  result: Record<string, any> | null; // raw LLM JSON for testing
};

/**
 * Uses LLM to select which specific entities are relevant for the user prompt.
 * Only called when Phase 1 determines entity types are needed.
 */
export async function selectRelevantEntities(
  userPrompt: string,
  projectId: string,
  storyId: string,
  entityType: EntityType
): Promise<EntitySelectionResult> {
  const projections = await loadEntityProjections(projectId, storyId, entityType);

  if (projections.length === 0) {
    return {
      selectedEntityIds: [],
      result: null,
    };
  }

  // Build prompt with projections
  const entityTypeLabel = entityType === 'character' ? 'Character' : 'Location';

  // Format projections as markdown sections
  const projectionsBlock = projections
    .map(({ id, projection }) => `### ${id}\n\n${projection}`)
    .join('\n\n');

  // Build JSON fields (one boolean per entity ID)
  const jsonFields = projections
    .map(({ id }) => `  "${id}": boolean, // true if ${id} is directly relevant`)
    .join('\n');

  const prompt = interpolate(entitySelectionPromptMd, {
    entityType,
    entityTypeLabel,
    projections: projectionsBlock,
    jsonFields,
  });

  try {
    const response = await window.chat.send({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      model: 'gpt-4o-mini',
      temperature: 0,
      maxTokens: 100,
      responseFormat: 'json',
    });

    if (!response.ok) {
      console.error('Entity selection LLM failed:', response.error);
      return {
        selectedEntityIds: [],
        result: null,
      };
    }

    const raw = response.data.output_text || '{}';
    const result = JSON.parse(raw) as Record<string, any>;

    // Extract selected entity IDs
    const selectedEntityIds: string[] = [];
    for (const id of projections.map(p => p.id)) {
      const value = result[id];
      if (value === true || value === 'true' || value === 1) {
        selectedEntityIds.push(id);
      }
    }

    return {
      selectedEntityIds,
      result,
    };
  } catch (error) {
    console.error('Entity selection failed:', error);
    return {
      selectedEntityIds: [],
      result: null,
    };
  }
}