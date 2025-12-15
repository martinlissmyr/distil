// src/models/entities/entityIndex.ts
import type { RelationshipDomain } from './characterDoc';

/**
  - Keep the **EntityIndex** "signals-only" (no full docs inline)
  - Align index projections with the CharacterDoc / LocationDoc structure
  - `RelationshipKind` is a **higher-level relationship model**:
    - `domains` (what kind of bond)
    - `valence` (supportive ↔ antagonistic)
    - `strength` (0..1 retrieval weighting)
    - `label` / `dynamics` / `notes` for nuance
  - Preps you to generate projections from docs deterministically
  */ 

export type EntityType = 'character' | 'location';
export type EntityTier = 'primary' | 'significant' | 'secondary';
export type EntityStatus = 'active' | 'inactive' | 'unknown';

/**
 * Reference to the full entity doc on disk / in store.
 * Keep this stable, so projections can be regenerated.
 */
export type EntityDocRef =
  | { type: 'character'; id: string; path?: string }
  | { type: 'location'; id: string; path?: string };

/**
 * Relationship signals in the index are only meant to help decide
 * whether to pull the full doc(s).
 */
export type EntityRelationshipSignal = {
  to: { type: EntityType; id: string };
  strength?: number; // 0..1 (retrieval weighting)
  valence?: 'supportive' | 'mixed' | 'conflicted' | 'antagonistic' | 'unknown';
  domains?: RelationshipDomain[]; // high-level bond domains
  label?: string; // e.g. “dubbelgångare”, “vän till familjen”, “chef”
  dynamics?: string[]; // short, high-signal relational engines
};

/**
 * "Signals only": tiny, high-signal projections for context selection.
 * These should be auto-derived from the full doc.

## Notes on projection generation (intent)

- `CharacterProjection.voice.typicalPhrases` and `.speechPatterns` should be short lists: 3–10 max.
- `relationships` in the index should only include:
  - edges with `strength >= threshold` (e.g. 0.4)
  - or edges with domains `power|ideological|romantic` (high-signal)
- Keep `logline` to ~1 sentence for cheap relevance checks.

 */

export type CharacterProjection = {
  roleInStory?: string;
  archetype?: string;

  voice?: {
    register?: string;
    tempo?: string;
    typicalPhrases?: string[];
    speechPatterns?: string[];
  };

  behavior?: {
    conflictStyle?: string[];
    decisionMode?: 'reactive' | 'proactive' | 'mixed' | 'unknown';
  };

  surface?: {
    tells?: string[];
  };

  /**
   * Optional: a very short, one-line logline helps selection a lot.
   * Keep it brief and "index-safe".
   */
  logline?: string;

  keywords?: string[];
  tags?: string[];

  /**
   * Optional relationship signals (only if useful for selection).
   * Keep small; don't try to encode a whole graph here.
   */
  relationships?: EntityRelationshipSignal[];
};

export type LocationProjection = {
  kind?: string;

  mood?: string[];
  function?: string[];
  hazards?: string[];

  logline?: string;

  keywords?: string[];
  tags?: string[];

  relationships?: EntityRelationshipSignal[];
};

export type EntityProjection =
  | { type: 'character'; projection: CharacterProjection }
  | { type: 'location'; projection: LocationProjection };

export type EntityIndexEntry = EntityProjection & {
  id: string;
  name: string;
  aliases?: string[];

  tier: EntityTier;
  status?: EntityStatus;

  docRef: EntityDocRef;

  updatedAt: string;
  createdAt?: string;
  sortOrder?: number;
};

export type EntityIndex = {
  version: 1;
  scope: { kind: 'story'; projectId: string; storyId: string };
  entities: EntityIndexEntry[];
  updatedAt: string;
};