// src/models/sections/index.ts
/**
 * Section Model - Centralized configuration for all app sections
 *
 * Defines navigation structure including story sections (prose, outline, etc.)
 * and root sections (projects, manifest, etc.) with UI metadata and routing config.
 */

import type { DocKindId } from '../docs';
import type { LucideIcon } from 'lucide-react';

// Re-export from lucide-react for convenience
import {
  NotebookPen,
  Lightbulb,
  Route,
  Globe,
  Users,
  MapPin,
  SquareLibrary,
  Feather,
  FlaskConical,
} from 'lucide-react';

/** Scope determines where a section appears in the navigation hierarchy */
export type SectionScope = 'root' | 'story';

/** Base configuration for all sections */
type BaseSectionConfig = {
  /** Unique identifier for the section */
  readonly id: string;

  /** Scope determines navigation hierarchy level */
  readonly scope: SectionScope;

  /** Display label in navigation */
  readonly label: string;

  /** Lucide icon component */
  readonly icon: LucideIcon;

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
  readonly component: 'StoryTextView' | 'StoryOutlineView' | 'StoryBriefView' | 'StoryWorldView' | 'Placeholder';
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
    scope: 'story',
    docKind: 'prose',
    label: 'Text',
    icon: NotebookPen,
    order: 1,
    component: 'StoryTextView',
    isImplemented: true,
  },

  brief: {
    id: 'brief',
    scope: 'story',
    docKind: 'brief',
    label: 'Brief / Idea',
    icon: Lightbulb,
    order: 2,
    component: 'StoryBriefView',
    isImplemented: true,
  },

  outline: {
    id: 'outline',
    scope: 'story',
    docKind: 'outline',
    label: 'Outline',
    icon: Route,
    order: 3,
    component: 'StoryOutlineView',
    isImplemented: true,
  },

  world: {
    id: 'world',
    scope: 'story',
    docKind: 'world',
    label: 'World',
    icon: Globe,
    order: 4,
    component: 'StoryWorldView',
    isImplemented: true,
  },

  characters: {
    id: 'characters',
    scope: 'story',
    docKind: 'characters',
    label: 'Characters',
    icon: Users,
    order: 5,
    component: 'Placeholder',
    isImplemented: false,
  },

  locations: {
    id: 'locations',
    scope: 'story',
    docKind: 'locations',
    label: 'Locations',
    icon: MapPin,
    order: 6,
    component: 'Placeholder',
    isImplemented: false,
  },

  // ─── Root Sections ───────────────────────────────────────────────

  projects: {
    id: 'projects',
    scope: 'root',
    label: 'Projects',
    icon: SquareLibrary,
    order: 1,
    component: 'ProjectsView',
    isImplemented: true,
  },

  manifest: {
    id: 'manifest',
    scope: 'root',
    docKind: 'manifest',
    label: 'Manifest',
    icon: Feather,
    order: 2,
    component: 'ManifestView',
    isImplemented: true,
  },

  playground: {
    id: 'playground',
    scope: 'root',
    label: 'Playground',
    icon: FlaskConical,
    order: 3,
    component: 'PlaygroundView',
    isImplemented: true,
    devOnly: true,
  },
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
    .filter(config => !config.devOnly || isDevMode)
    .filter(config => !implementedOnly || config.isImplemented)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get the doc kind for a section (if it has one)
 */
export function getSectionDocKind(id: SectionId): DocKindId | undefined {
  return sectionConfigs[id].docKind;
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
  return Object.values(sectionConfigs).find(config => config.docKind === docKind);
}
