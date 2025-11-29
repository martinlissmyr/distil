// src/chat/contextRules.ts
import type { EditorKind } from '../types/chat';
import type { MetaDocKey } from '../types/metaDoc';

/**
 * Defines which context documents should be included for each editor kind
 */
export type ContextRules = {
  /**
   * Always include these documents as context (no intelligence needed)
   * Example: Manifest is always included for prose editing
   */
  alwaysInclude: MetaDocKey[];

  /**
   * Never include these documents as context
   * Example: Outline should never be included when editing Brief
   */
  neverInclude: MetaDocKey[];

  /**
   * Use intelligent selection (LLM/heuristic) to decide if these should be included
   * Example: Brief/Outline for prose - depends on user's question
   */
  intelligentlySelect: MetaDocKey[];
};

/**
 * Context inclusion rules for each editor kind
 *
 * Key principles:
 * - Manifest is almost always included (except when editing Manifest itself)
 * - Brief is high-level and typically written BEFORE other docs, so it receives minimal context
 * - Outline builds on Brief, so Brief is always included
 * - Hierarchical dependency: Brief → Outline → [future: Characters/Places] → Prose
 */
export const CONTEXT_RULES: Record<EditorKind, ContextRules> = {
  /**
   * PROSE EDITOR
   * The main story text - most flexible context needs
   */
  prose: {
    alwaysInclude: ['manifest'],
    neverInclude: [],
    intelligentlySelect: ['brief', 'outline'], // Future: 'characters', 'places'
  },

  /**
   * BRIEF EDITOR
   * High-level premise/themes - written early, minimal context needed
   */
  brief: {
    alwaysInclude: ['manifest'],
    neverInclude: ['outline'], // Future: 'characters', 'places'
    intelligentlySelect: [],
  },

  /**
   * OUTLINE EDITOR
   * Plot structure - builds on Brief
   */
  outline: {
    alwaysInclude: ['manifest', 'brief'],
    neverInclude: [],
    intelligentlySelect: [], // Future: 'characters', 'places'
  },

  /**
   * MANIFEST EDITOR
   * Author-level style guide - no story-specific context
   */
  manifest: {
    alwaysInclude: [],
    neverInclude: ['brief', 'outline'], // Future: 'characters', 'places'
    intelligentlySelect: [],
  },

  // Future editor kinds (commented out for now):
  //
  // characters: {
  //   alwaysInclude: ['manifest', 'brief'],
  //   neverInclude: [],
  //   intelligentlySelect: ['outline', 'places'],
  // },
  //
  // places: {
  //   alwaysInclude: ['manifest', 'brief'],
  //   neverInclude: [],
  //   intelligentlySelect: ['outline', 'characters'],
  // },
};

/**
 * Get context rules for a specific editor kind
 */
export function getContextRules(kind: EditorKind): ContextRules {
  return CONTEXT_RULES[kind];
}

/**
 * Check if a document should always be included for a given editor kind
 */
export function shouldAlwaysInclude(editorKind: EditorKind, docKey: MetaDocKey): boolean {
  return CONTEXT_RULES[editorKind].alwaysInclude.includes(docKey);
}

/**
 * Check if a document should never be included for a given editor kind
 */
export function shouldNeverInclude(editorKind: EditorKind, docKey: MetaDocKey): boolean {
  return CONTEXT_RULES[editorKind].neverInclude.includes(docKey);
}

/**
 * Check if a document needs intelligent selection for a given editor kind
 */
export function needsIntelligentSelection(editorKind: EditorKind, docKey: MetaDocKey): boolean {
  return CONTEXT_RULES[editorKind].intelligentlySelect.includes(docKey);
}
