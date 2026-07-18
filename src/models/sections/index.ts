// src/models/sections/index.ts
/**
 * Section Model - Centralized configuration for all app sections
 *
 * Defines navigation structure including story sections (prose, outline, etc.)
 * and root sections (projects, manifest, etc.) with UI metadata and routing config.
 */

import type { DocKindId } from '../docs';
import type { UiMode } from '../../types/ui';

/** Scope determines where a section appears in the navigation hierarchy */
export type SectionScope = 'root' | 'story';

/** Base configuration for all sections */
type BaseSectionConfig = {
  /** Unique identifier for the section */
  readonly id: string;

  /** Unique identifier for the section */
  readonly uiMode: UiMode;

  /** Scope determines navigation hierarchy level */
  readonly scope: SectionScope;

  /** Display label in navigation */
  readonly label: string;

  /** Display order (lower = earlier) */
  readonly order: number;

  /** Whether this section is fully implemented */
  readonly isImplemented: boolean;

  /** Dev-only section (requires dev mode to show) */
  readonly devOnly?: boolean;
};

/** Story-scoped section configuration */
export type StorySectionConfig = BaseSectionConfig & {
  readonly scope: 'story';
  /** The doc kind this section edits (if any) - using string to allow future doc kinds not yet in model */
  readonly docKind?: DocKindId | string;
  /** View component name for routing */
  readonly component: 'StoryTextView' | 'StoryOutlineView' | 'StoryBriefView' | 'StoryWorldView' | 'StoryStyleView' | 'EntityIndexView' | 'Placeholder';
};

/** Root-scoped section configuration */
export type RootSectionConfig = BaseSectionConfig & {
  readonly scope: 'root';
  /** The doc kind this section edits (if any) */
  readonly docKind?: DocKindId | string;
  /** View component name for routing */
  readonly component: 'ProjectsView' | 'ManifestView' | 'PlaygroundView';
};

export type SectionConfig = StorySectionConfig | RootSectionConfig;

/**
 * Centralized section registry
 *
 * All sections defined here with complete metadata for UI generation and routing.
 * Follows LCRF layer ordering for story sections (concept → structure → detail).
 */
export const sectionConfigs = {
  // ─── Story Sections ──────────────────────────────────────────────
  // Shows text first, then meta docs rrdered by LCRF layers: concept → structure → world → entities

  prose: {
    id: 'prose',
    uiMode: 'prose',
    scope: 'story',
    docKind: 'prose',
    label: 'Writing',
    order: 1,
    component: 'StoryTextView',
    isImplemented: true,
  } as const as StorySectionConfig,

  brief: {
    id: 'brief',
    uiMode: 'meta',
    scope: 'story',
    docKind: 'brief',
    label: 'Brief / Idea',
    order: 2,
    component: 'StoryBriefView',
    isImplemented: true,
  } as const as StorySectionConfig,

  outline: {
    id: 'outline',
    uiMode: 'meta',
    scope: 'story',
    docKind: 'outline',
    label: 'Outline',
    order: 3,
    component: 'StoryOutlineView',
    isImplemented: true,
  } as const as StorySectionConfig,

  world: {
    id: 'world',
    uiMode: 'meta',
    scope: 'story',
    docKind: 'world',
    label: 'World',
    order: 4,
    component: 'StoryWorldView',
    isImplemented: true,
  } as const as StorySectionConfig,

  characters: {
    id: 'characters',
    uiMode: 'meta',
    scope: 'story',
    docKind: 'characters',
    label: 'Characters',
    order: 5,
    component: 'EntityIndexView',
    isImplemented: true,
  } as const as StorySectionConfig,

  locations: {
    id: 'locations',
    uiMode: 'meta',
    scope: 'story',
    docKind: 'locations',
    label: 'Locations',
    order: 6,
    component: 'EntityIndexView',
    isImplemented: true,
  } as const as StorySectionConfig,

  style: {
    id: 'style',
    uiMode: 'meta',
    scope: 'story',
    docKind: 'style',
    label: 'Style',
    order: 7,
    component: 'StoryStyleView',
    isImplemented: true,
  } as const as StorySectionConfig,

  // ─── Root Sections ───────────────────────────────────────────────

  projects: {
    id: 'projects',
    uiMode: 'default',
    scope: 'root',
    label: 'Projects',
    order: 1,
    component: 'ProjectsView',
    isImplemented: true,
  } as const as RootSectionConfig,

  manifest: {
    id: 'manifest',
    uiMode: 'meta',
    scope: 'root',
    docKind: 'manifest',
    label: 'Manifest',
    order: 2,
    component: 'ManifestView',
    isImplemented: true,
  } as const as RootSectionConfig,

  playground: {
    id: 'playground',
    uiMode: 'default',
    scope: 'root',
    label: 'Playground',
    order: 3,
    component: 'PlaygroundView',
    isImplemented: true,
    devOnly: true,
  } as const as RootSectionConfig,
} as const;

// ─── Derived Types ───────────────────────────────────────────────────

/** Union of all section IDs */
export type SectionId = keyof typeof sectionConfigs;

/** Union of story section IDs */
export type StorySectionId = {
  [K in SectionId]: typeof sectionConfigs[K] extends StorySectionConfig ? K : never;
}[SectionId];

/** Union of root section IDs */
export type RootSectionId = {
  [K in SectionId]: typeof sectionConfigs[K] extends RootSectionConfig ? K : never;
}[SectionId];

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Get configuration for a specific section
 */
export function getSectionConfig(id: SectionId): SectionConfig {
  return sectionConfigs[id];
}

/**
 * Get all story sections, optionally filtered by implementation status
 */
export function getStorySections(options?: {
  implementedOnly?: boolean;
}): StorySectionConfig[] {
  const sections = Object.values(sectionConfigs)
    .filter((config): config is StorySectionConfig => config.scope === 'story')
    .sort((a, b) => a.order - b.order);

  if (options?.implementedOnly) {
    return sections.filter(s => s.isImplemented);
  }

  return sections;
}

/**
 * Get all root sections, respecting dev mode and implementation status
 */
export function getRootSections(options?: {
  isDevMode?: boolean;
  implementedOnly?: boolean;
}): RootSectionConfig[] {
  const { isDevMode = false, implementedOnly = false } = options ?? {};

  return Object.values(sectionConfigs)
    .filter((config): config is RootSectionConfig => config.scope === 'root')
    .filter(config => !(config.devOnly ?? false) || isDevMode)
    .filter(config => !implementedOnly || config.isImplemented)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get the doc kind for a section (if it has one)
 */
export function getSectionDocKind(id: SectionId): DocKindId | string | undefined {
  const config = sectionConfigs[id];
  return 'docKind' in config ? config.docKind : undefined;
}

/**
 * Check if a section is implemented
 */
export function isSectionImplemented(id: SectionId): boolean {
  return sectionConfigs[id].isImplemented;
}

/**
 * Get section by doc kind (reverse lookup)
 */
export function getSectionByDocKind(docKind: DocKindId): SectionConfig | undefined {
  return Object.values(sectionConfigs).find(
    config => 'docKind' in config && config.docKind === docKind
  );
}
