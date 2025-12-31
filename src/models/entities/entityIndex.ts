// src/models/entities/entityIndex.ts

export type EntityType = 'character' | 'location';

/**
 * Reference to the full entity doc on disk / in store.
 * Keep this stable, so projections can be regenerated.
 */
export type EntityDocRef =
  | { type: 'character'; id: string; path?: string }
  | { type: 'location'; id: string; path?: string };

export type EntityIndexEntry = {
  id: string;
  name: string;
  docRef: EntityDocRef;
  sortOrder?: number;
};

export type EntityIndex = {
  version: 1;
  scope: { kind: 'story'; projectId: string; storyId: string };
  entities: EntityIndexEntry[];
  updatedAt: string;
};