// src/models/docs/index.ts
import type { EditorConfig } from './editorConfig';
import { proseEditorConfig, metaEditorConfig } from './editorConfig';
import type { EntityType } from '../entities/entityIndex';

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

/**
 * The hierarchical level where a document kind lives.
 * - 'root': Global/author-level (e.g., manifest)
 * - 'project': Project-level (future: project concepts)
 * - 'story': Story-level (e.g., brief, outline, prose)
 *
 * Renamed from DocScope to avoid confusion with runtime DocRef.
 */
export type DocScopeLevel = 'root' | 'project' | 'story';
export type DocRole = 'meta' | 'primary';

// ---------------------------------------------------------------------------
// Interface definitions (must come before docKinds)
// ---------------------------------------------------------------------------

// Forward declare MetaDocKey to break circular references in additionalContexts
type MetaDocKeyBase = 'manifest' | 'brief' | 'outline' | 'world' | 'characters' | 'locations';

/**
 * Rich text documents store TipTap JSONContent and use standard editors.
 */
export interface RichTextDocConfig {
  storageType: 'richText';
  id: string;
  scope: DocScopeLevel;
  role: DocRole;
  title: string;
  shortDescription: string;
  contextTag?: string;
  contextLayer: ContextLayer;
  isContextDoc: boolean;
  editorConfig: EditorConfig;
  contextCriteria?: string;
  contextIncludes?: string[];
  contextUsageHint?: string;
  additionalContexts?: {
    alwaysInclude?: MetaDocKeyBase[];
    intelligentlySelect?: MetaDocKeyBase[];
  };
}

/**
 * Entity index documents store entity metadata and use custom UI.
 * No editorConfig - entity indices use custom entity management interfaces.
 */
export interface EntityIndexDocConfig {
  storageType: 'entityIndex';
  id: string;
  entityType: EntityType;
  scope: DocScopeLevel;
  role: DocRole;
  title: string;
  shortDescription: string;
  contextTag?: string;
  contextLayer: ContextLayer;
  isContextDoc: boolean;
  contextCriteria?: string;
  contextIncludes?: string[];
  contextUsageHint?: string;
  additionalContexts?: {
    alwaysInclude?: MetaDocKeyBase[];
    intelligentlySelect?: MetaDocKeyBase[];
  };
  // NO editorConfig - entity indices use custom UI
}

/**
 * Multi-part text documents store prose as multiple parts/chapters.
 * Each part is a separate TipTap document stored independently.
 */
export interface MultiPartTextDocConfig {
  storageType: 'multiPartText';
  id: string;
  scope: DocScopeLevel;
  role: DocRole;
  title: string;
  shortDescription: string;
  contextLayer: ContextLayer;
  isContextDoc: boolean;
  editorConfig: EditorConfig;
  contextCriteria?: string;
  contextIncludes?: string[];
  contextUsageHint?: string;
  additionalContexts?: {
    alwaysInclude?: MetaDocKeyBase[];
    intelligentlySelect?: MetaDocKeyBase[];
  };
}

/**
 * Discriminated union of all document configurations.
 * Use type guards (isRichTextDoc, isEntityIndexDoc, isMultiPartTextDoc) to narrow types.
 */
export type DocKindConfig = RichTextDocConfig | EntityIndexDocConfig | MultiPartTextDocConfig;

// ---------------------------------------------------------------------------
// Core doc kinds
// ---------------------------------------------------------------------------

export const docKinds = {
  manifest: {
    storageType: 'richText',
    id: 'manifest',
    scope: 'root',
    role: 'meta',
    title: 'Author Manifest',
    shortDescription: 'An author manifest (style/tone)',
    contextTag: 'style/tone',
    contextLayer: 'author',
    isContextDoc: true,
    editorConfig: metaEditorConfig,
    // No contextCriteria/contextIncludes/contextUsageHint for now
  } satisfies RichTextDocConfig,
  brief: {
    storageType: 'richText',
    id: 'brief',
    scope: 'story',
    role: 'meta',
    title: 'Story Brief',
    shortDescription: 'A story brief (high-level concept)',
    contextTag: 'high-level concept',
    contextLayer: 'storyConcept',
    isContextDoc: true,
    editorConfig: metaEditorConfig,
    contextCriteria:
      "Required if understanding the story's core idea, themes, tone, or principal character concepts would inform or improve the answer.",
    contextIncludes: [
      'Core idea/concept',
      'Central premise',
      'Themes',
      'Tone',
      'Main character concepts',
    ],
    contextUsageHint:
      'these qualities would shape the requested writing style or substance.',
  } satisfies RichTextDocConfig,
  outline: {
    storageType: 'richText',
    id: 'outline',
    scope: 'story',
    role: 'meta',
    title: 'Story Outline',
    shortDescription: 'A story outline (structure/plot)',
    contextTag: 'structure/plot',
    contextLayer: 'storyStructure',
    isContextDoc: true,
    editorConfig: metaEditorConfig,
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
    additionalContexts: {
      intelligentlySelect: ['world', 'characters', 'locations'],
    },
  } satisfies RichTextDocConfig,
  world: {
    storageType: 'richText',
    id: 'world',
    scope: 'story',
    role: 'meta',
    title: 'Story World Description',
    shortDescription: 'World information (setting/worldbuilding)',
    contextTag: 'setting/worldbuilding',
    contextLayer: 'storyWorld',
    isContextDoc: true,
    editorConfig: metaEditorConfig,
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
  } satisfies RichTextDocConfig,
  prose: {
    storageType: 'multiPartText',
    id: 'prose',
    scope: 'story',
    role: 'primary',
    title: 'Story Prose',
    shortDescription: 'The story (what the author is currently working on)',
    contextLayer: 'storyText',
    isContextDoc: false,
    editorConfig: proseEditorConfig,
  } satisfies MultiPartTextDocConfig,
  characters: {
    storageType: 'entityIndex',
    id: 'characters',
    entityType: 'character',
    scope: 'story',
    role: 'meta',
    title: 'Characters',
    shortDescription: 'Character information (identities/relationships/behaviors)',
    contextTag: 'characters/relationships',
    contextLayer: 'storyEntities',
    isContextDoc: true,
    contextCriteria: 'Required if knowledge of character identities, relationships, behaviors, voices, or arcs would inform or enhance the response.',
    contextIncludes: [
      'Character identities and roles',
      'Relationships and dynamics',
      'Behaviors and voices',
      'Character arcs and motivations',
      'Physical descriptions and tells',
    ],
    contextUsageHint: 'the request involves character-specific details, dialogue, or relationship dynamics.',
  } satisfies EntityIndexDocConfig,
  locations: {
    storageType: 'entityIndex',
    id: 'locations',
    entityType: 'location',
    scope: 'story',
    role: 'meta',
    title: 'Locations',
    shortDescription: 'Location information (settings/atmosphere/function)',
    contextTag: 'locations/settings',
    contextLayer: 'storyEntities',
    isContextDoc: true,
    contextCriteria: 'Required if specific location details, atmosphere, function, or spatial relationships would inform or enhance the response.',
    contextIncludes: [
      'Location kinds and purposes',
      'Atmosphere and mood',
      'Function in story',
      'Hazards and constraints',
      'Spatial relationships',
    ],
    contextUsageHint: 'the request involves descriptions of locations, scene-setting, location-specific details, or spatial context.',
  } satisfies EntityIndexDocConfig,
} as const;

// Now derive the actual types from the const object
export type DocKindId = keyof typeof docKinds;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Type guard to check if a document configuration is a rich text document.
 * Use this to safely access editorConfig.
 */
export function isRichTextDoc(config: DocKindConfig): config is RichTextDocConfig {
  return config.storageType === 'richText';
}

/**
 * Type guard to check if a document configuration is an entity index document.
 * Use this to safely access entityType.
 */
export function isEntityIndexDoc(config: DocKindConfig): config is EntityIndexDocConfig {
  return config.storageType === 'entityIndex';
}

/**
 * Type guard to check if a document configuration is a multi-part text document.
 * Use this to safely access editorConfig for multi-part prose.
 */
export function isMultiPartTextDoc(config: DocKindConfig): config is MultiPartTextDocConfig {
  return config.storageType === 'multiPartText';
}

// ---------------------------------------------------------------------------
// Derived unions (MetaDocKey, etc.)
// ---------------------------------------------------------------------------

export type StoryDocKindId = {
  [K in DocKindId]: (typeof docKinds)[K]['scope'] extends 'story' ? K : never;
}[DocKindId];

// Optional convenience, if you want it elsewhere (UI etc.)
export const storyDocKindIds: StoryDocKindId[] = (Object.keys(docKinds) as DocKindId[])
  .filter((k) => docKinds[k].scope === 'story') as StoryDocKindId[];
  
/**
 * All kinds that are "meta docs" (everything except the actual story text).
 * We derive this from the runtime docKinds object to ensure type safety.
 */
export type MetaDocKey = Extract<DocKindId, {
  [K in DocKindId]: (typeof docKinds)[K]['role'] extends 'meta' ? K : never;
}[DocKindId]>;

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
  const cfg = docKinds[key] as DocKindConfig;
  if (!cfg) return String(key).toUpperCase();

  const base = cfg.title ? cfg.title.toUpperCase() : String(key).toUpperCase();

  if ('contextTag' in cfg && cfg.contextTag) {
    return `${base} (${cfg.contextTag})`;
  }

  if (cfg.shortDescription) {
    return `${base} (${cfg.shortDescription})`;
  }

  return base;
}

export function getDocScope(key: DocKindId): DocScopeLevel {
  return docKinds[key]?.scope;
}

export function getContextLayer(key: DocKindId): ContextLayer {
  return docKinds[key]?.contextLayer;
}

export function isMetaDocKey(key: DocKindId): key is MetaDocKey {
  return docKinds[key].role === 'meta';
}

export function getContextCriteriaLine(key: MetaDocKey): string | null {
  const cfg = docKinds[key] as DocKindConfig;
  if (!cfg || !('contextCriteria' in cfg) || !cfg.contextCriteria) return null;

  // Keep the id (brief/outline/world) bolded like before
  return `  - **${key}**: ${cfg.contextCriteria}`;
}

export function getContextDefinitionBlock(key: MetaDocKey): string | null {
  const cfg = docKinds[key] as DocKindConfig;
  if (!cfg) return null;

  const title = cfg.title ?? key[0].toUpperCase() + key.slice(1);
  const parts: string[] = [];

  parts.push(`## ${title}`);

  if ('contextIncludes' in cfg && cfg.contextIncludes && cfg.contextIncludes.length > 0) {
    parts.push('Includes:');
    parts.push(
      ...cfg.contextIncludes.map((item) => `- ${item}`)
    );
  }

  if ('contextUsageHint' in cfg && cfg.contextUsageHint) {
    parts.push('');
    parts.push(`Use when ${cfg.contextUsageHint}`);
  }

  return parts.join('\n');
}

export function assertContextGuidanceAvailable(key: MetaDocKey): void {
  const cfg = docKinds[key] as DocKindConfig;
  if (!cfg) {
    throw new Error(`Unknown DocKindId: "${key}" used for context classification.`);
  }

  const hasContextCriteria = 'contextCriteria' in cfg && cfg.contextCriteria;
  const hasContextIncludes = 'contextIncludes' in cfg && cfg.contextIncludes;
  const hasContextUsageHint = 'contextUsageHint' in cfg && cfg.contextUsageHint;

  if (!hasContextCriteria || !hasContextIncludes || !hasContextUsageHint) {
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
export { getSystemTriggersForDocKind } from './systemTriggers';

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
 * This reproduces the CONTEXT_RULES:
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

  // Merge any additionalContexts from the target document configuration
  if ('additionalContexts' in targetCfg && targetCfg.additionalContexts) {
    const additional = targetCfg.additionalContexts;
    if ('alwaysInclude' in additional && Array.isArray(additional.alwaysInclude)) {
      for (const key of additional.alwaysInclude) {
        if (!alwaysInclude.includes(key)) {
          alwaysInclude.push(key);
        }
      }
    }
    if ('intelligentlySelect' in additional && Array.isArray(additional.intelligentlySelect)) {
      for (const key of additional.intelligentlySelect) {
        if (!intelligentlySelect.includes(key)) {
          intelligentlySelect.push(key);
        }
      }
    }
  }

  return { alwaysInclude, intelligentlySelect };
}