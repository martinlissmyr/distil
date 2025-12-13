// src/docs/index.ts

// ---------------------------------------------------------------------------
// Axes & base types
// ---------------------------------------------------------------------------

/**
 * Describes how "upstream" a document is as context.
 * Lower index = more general / upstream.
 */
export const contextLayerOrder = [
  'author',         // Global author-wide context
  'projectConcept', // Project-level concept / universe (future)
  'storyConcept',   // Story-level concept / brief
  'storyStructure', // Outline / beats / structure
  'storyWorld',     // Worldbuilding for the story
  'storyEntities',  // Characters, locations, etc. (future)
  'storyText',      // Final prose / story text
] as const;

export type ContextLayer = (typeof contextLayerOrder)[number];

export type DocScope = 'root' | 'project' | 'story';
export type DocRole = 'meta' | 'primary';

// ---------------------------------------------------------------------------
// Core doc kinds
// ---------------------------------------------------------------------------

export const docKinds = {
  manifest: {
    id: 'manifest',
    scope: 'root' as DocScope,
    role: 'meta' as DocRole,
    title: 'Author Manifest',
    shortDescription: 'An author manifest (style/tone)',
    contextTag: 'style/tone',
    contextLayer: 'author' as ContextLayer,
    isContextDoc: true as const,
    // No contextCriteria/contextIncludes/contextUsageHint for now
  },
  brief: {
    id: 'brief',
    scope: 'story' as DocScope,
    role: 'meta' as DocRole,
    title: 'Story Brief',
    shortDescription: 'A story brief (high-level concept)',
    contextTag: 'high-level concept',
    contextLayer: 'storyConcept' as ContextLayer,
    isContextDoc: true as const,
    contextCriteria:
      'Required if understanding the story’s core idea, themes, tone, or principal character concepts would inform or improve the answer.',
    contextIncludes: [
      'Core idea/concept',
      'Central premise',
      'Themes',
      'Tone',
      'Main character concepts',
    ],
    contextUsageHint:
      'these qualities would shape the requested writing style or substance.',
  },
  outline: {
    id: 'outline',
    scope: 'story' as DocScope,
    role: 'meta' as DocRole,
    title: 'Story Outline',
    shortDescription: 'A story outline (structure/plot)',
    contextTag: 'structure/plot',
    contextLayer: 'storyStructure' as ContextLayer,
    isContextDoc: true as const,
    contextCriteria:
      'Required if knowledge of the plot structure, narrative flow, character arcs, or story events is needed to influence or enhance the response.',
    contextIncludes: [
      'Plot structure and event sequence',
      'Character arcs and motivations',
      'Relationships/conflicts',
      'Turning points, reveals, and resolutions',
      'Scene/sequence order',
    ],
    contextUsageHint:
      'context involving story events—past or future—is necessary.',
  },
  world: {
    id: 'world',
    scope: 'story' as DocScope,
    role: 'meta' as DocRole,
    title: 'World',
    shortDescription: 'World information (setting/worldbuilding)',
    contextTag: 'setting/worldbuilding',
    contextLayer: 'storyWorld' as ContextLayer,
    isContextDoc: true as const,
    contextCriteria:
      'Required if familiarity with the setting, period, world-building details, rules, geography, culture, or historical background is essential for completing the request.',
    contextIncludes: [
      'Setting/location details',
      'Time period/historical background',
      'World-building/rules',
      'Geography/environment',
      'Culture/society',
      'What is canonical, relevant, suitable or natural for a specific time period, location etc.',
    ],
    contextUsageHint:
      'the request calls for a detailed depiction of locations, eras, or world-specific characteristics.',
  },
  prose: {
    id: 'prose',
    scope: 'story' as DocScope,
    role: 'primary' as DocRole,
    title: 'Prose',
    shortDescription: 'The story (what the author is currently working on)',
    contextLayer: 'storyText' as ContextLayer,
    isContextDoc: false as const,
  },
} as const;

export type DocKindConfig = {
  id: DocKindId;
  scope: DocScope;
  role: DocRole;

  title: string;
  shortDescription: string;

  /**
   * Short label for the kind of context this doc provides,
   * e.g. "style/tone", "high-level concept", "structure/plot".
   */
  contextTag?: string;

  contextLayer: ContextLayer;
  isContextDoc: boolean;

  /**
   * One-line criterion describing when this doc is needed as context.
   * Used in the LLM context-classification "criteria" list.
   */
  contextCriteria?: string;

  /**
   * Bullet list of what this doc contains, used to explain it to the LLM.
   */
  contextIncludes?: string[];

  /**
   * One-line hint for when to use this doc, appended after "Use when ".
   */
  contextUsageHint?: string;
};

type DocKindConfigMap = typeof docKinds;

export type DocKindId = keyof DocKindConfigMap;
export type DocKindConfig = DocKindConfigMap[DocKindId];

// ---------------------------------------------------------------------------
// Derived unions (MetaDocKey, etc.)
// ---------------------------------------------------------------------------

/**
 * All kinds that are "meta docs" (everything except the actual story text).
 */
export type MetaDocKey = {
  [K in DocKindId]: DocKindConfigMap[K]['role'] extends 'meta' ? K : never;
}[DocKindId];

export const metaDocKindIds: MetaDocKey[] = (Object.keys(docKinds) as DocKindId[])
  .filter((k) => docKinds[k].role === 'meta') as MetaDocKey[];

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export function getDocKind<K extends DocKindId>(key: K): DocKindConfig {
  return docKinds[key];
}

export function getDocDescription(key: DocKindId): string {
  // Keep this as the "short blurb"
  return docKinds[key]?.shortDescription ?? String(key);
}

export function getDocTitle(key: DocKindId): string {
  return docKinds[key]?.title ?? String(key);
}

/**
 * Label used when embedding this doc as context in prompts, e.g.:
 * "AUTHOR MANIFEST (style/tone)"
 * "STORY OUTLINE (structure/plot)"
 */
export function getDocContextLabel(key: DocKindId): string {
  const cfg = docKinds[key];
  if (!cfg) return String(key).toUpperCase();

  const base = cfg.title ? cfg.title.toUpperCase() : String(key).toUpperCase();

  if (cfg.contextTag) {
    return `${base} (${cfg.contextTag})`;
  }

  if (cfg.shortDescription) {
    return `${base} (${cfg.shortDescription})`;
  }

  return base;
}

export function getDocScope(key: DocKindId): DocScope {
  return docKinds[key]?.scope;
}

export function getContextLayer(key: DocKindId): ContextLayer {
  return docKinds[key]?.contextLayer;
}

export function isMetaDocKey(key: DocKindId): key is MetaDocKey {
  return docKinds[key].role === 'meta';
}

export function getContextCriteriaLine(key: MetaDocKey): string | null {
  const cfg = docKinds[key];
  if (!cfg?.contextCriteria) return null;

  // Keep the id (brief/outline/world) bolded like before
  return `  - **${key}**: ${cfg.contextCriteria}`;
}

export function getContextDefinitionBlock(key: MetaDocKey): string | null {
  const cfg = docKinds[key];
  if (!cfg) return null;

  const title = cfg.title ?? key[0].toUpperCase() + key.slice(1);
  const parts: string[] = [];

  parts.push(`## ${title}`);

  if (cfg.contextIncludes && cfg.contextIncludes.length > 0) {
    parts.push('Includes:');
    parts.push(
      ...cfg.contextIncludes.map((item) => `- ${item}`)
    );
  }

  if (cfg.contextUsageHint) {
    parts.push('');
    parts.push(`Use when ${cfg.contextUsageHint}`);
  }

  return parts.join('\n');
}

export function assertContextGuidanceAvailable(key: MetaDocKey): void {
  const cfg = docKinds[key];
  if (!cfg) {
    throw new Error(`Unknown DocKindId: "${key}" used for context classification.`);
  }

  if (!cfg.contextCriteria || !cfg.contextIncludes || !cfg.contextUsageHint) {
    throw new Error(
      `DocKind "${key}" is missing required context guidance.\n` +
        `Add contextCriteria, contextIncludes, and contextUsageHint to docKinds["${key}"]`
    );
  }
}

export {
  getContextKeywordsForLanguage,
  getKeywordsForDocKind,
} from './contextKeywords';

export { getSystemRoleForDocKind } from './systemRoles';

// ---------------------------------------------------------------------------
// Context rules derived from the model
// ---------------------------------------------------------------------------

export type ContextRules = {
  alwaysInclude: MetaDocKey[];
  intelligentlySelect: MetaDocKey[];
};

/**
 * Derive which meta docs should be used as context for a given target doc.
 *
 * Policy:
 * - Only meta docs (`role === 'meta'`) with `isContextDoc === true`.
 * - Only docs that are at the same or *earlier* context layer are candidates.
 * - If the target is a meta doc:
 *     → all upstream candidate meta docs go into alwaysInclude.
 * - If the target is a primary doc (prose):
 *     → root-scope meta docs go into alwaysInclude.
 *     → story-scope meta docs go into intelligentlySelect.
 *
 * This reproduces your original CONTEXT_RULES:
 *   prose   → always: [manifest], intelligent: [brief, outline, world]
 *   brief   → always: [manifest]
 *   outline → always: [manifest, brief]
 *   world   → always: [manifest, brief]
 *   manifest → none
 */
export function getContextRulesFor(target: DocKindId): ContextRules {
  const targetCfg = docKinds[target];
  const targetLayerIndex = contextLayerOrder.indexOf(targetCfg.contextLayer);

  const alwaysInclude: MetaDocKey[] = [];
  const intelligentlySelect: MetaDocKey[] = [];

  for (const kind of Object.keys(docKinds) as DocKindId[]) {
    if (kind === target) continue;

    const cfg = docKinds[kind];

    if (!cfg.isContextDoc) continue;
    if (cfg.role !== 'meta') continue;

    const layerIndex = contextLayerOrder.indexOf(cfg.contextLayer);
    if (layerIndex === -1 || layerIndex > targetLayerIndex) continue;

    if (targetCfg.role === 'meta') {
      // When editing a meta doc, all upstream meta docs are always included.
      alwaysInclude.push(kind as MetaDocKey);
    } else {
      // When editing the primary text (prose):
      // - Root meta docs are always included
      // - Story meta docs are selected intelligently
      if (cfg.scope === 'root') {
        alwaysInclude.push(kind as MetaDocKey);
      } else {
        intelligentlySelect.push(kind as MetaDocKey);
      }
    }
  }

  return { alwaysInclude, intelligentlySelect };
}