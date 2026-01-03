// src/models/entities/entityIndex.ts

export type EntityType = 'character' | 'location';

/**
 * Reference to the full entity doc on disk / in store.
 * Keep this stable, so projections can be regenerated.
 */
export type EntityDocRef =
  | { type: 'character'; id: string; path?: string }
  | { type: 'location'; id: string; path?: string };

/**
 * Lightweight projection of an entity for list views and context selection.
 */
export type EntityIndexEntry = {
  id: string;
  name: string;
  docRef: EntityDocRef;
  sortOrder?: number;
  /**
   * Markdown representation derived from entity doc using projection template.
   * Used for LLM context selection (lighter weight than full entity doc).
   * Regenerable from entity doc at any time.
   */
  projection?: string;
};

export type EntityIndex = {
  version: 1;
  scope: { kind: 'story'; projectId: string; storyId: string };
  entities: EntityIndexEntry[];
  updatedAt: string;
};