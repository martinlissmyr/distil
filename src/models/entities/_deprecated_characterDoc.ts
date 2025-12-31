// src/models/entities/characterDoc.ts
import type { RichText } from './richText';

export type CharacterTier = 'primary' | 'significant' | 'secondary';
export type CharacterStatus = 'active' | 'inactive' | 'unknown';
export type CharacterRef = { id: string; name?: string };

/**
 * Higher-level relationship model (Option A):
 * - domains: what kind of bond (can be multiple)
 * - valence: supportive/mixed/conflicted/antagonistic
 * - strength: 0..1 (retrieval / relevance weighting)
 * - label/dynamics/notes: nuance without schema explosion
 */
export type RelationshipDomain =
  | 'romantic'
  | 'sexual'
  | 'family'
  | 'friendship'
  | 'community'
  | 'professional'
  | 'authority'
  | 'caretaking'
  | 'power'
  | 'ideological'
  | 'mystery'
  | 'other';

export type RelationshipValence =
  | 'supportive'
  | 'mixed'
  | 'conflicted'
  | 'antagonistic'
  | 'unknown';

export type Relationship = {
  to: CharacterRef;

  /**
   * What kind(s) of bond is this?
   * Multiple domains allow combos like:
   * - professional + power
   * - romantic + power
   * - community + ideological
   */
  domains?: RelationshipDomain[];

  /**
   * Overall "direction" of the bond in-story.
   * Not a moral judgement; a narrative signal.
   */
  valence?: RelationshipValence;

  /**
   * Free label for author intent:
   * e.g. “dubbelgångare”, “chef”, “vän till familjen”
   */
  label?: string;

  /**
   * Short phrases that capture the relational engine.
   * Great signals for context selection.
   */
  dynamics?: string[]; // e.g. “spegel”, “bekräftelse”, “misstro”

  /**
   * Optional guided note (keep short).
   */
  notes?: string;

  /**
   * 0..1 weighting for retrieval heuristics / context selection.
   * Use:
   * - 0.9 for central bonds (spouse, nemesis, foil)
   * - 0.3 for ambient/community ties
   */
  strength?: number;
};

export type CharacterIdentity = {
  /**
   * Writer-facing “who are they?”
   */
  name: string;
  aliases?: string[];

  age?: { approx?: string; exact?: number }; // “fyrtioårsåldern”
  gender?: string;

  roleInStory?: string; // protagonist, antagonist, foil, witness...
  archetype?: string; // optional “the mask”, “the investigator”

  occupation?: string;
  socialPosition?: string; // “högre banktjänsteman…”
  settingAnchor?: string; // where/when they belong in story world
};

export type CharacterSurface = {
  /**
   * What the reader sees first.
   * Keep these as signals, not paragraphs.
   */
  firstImpression?: string; // 1–2 sentences
  demeanor?: string[]; // “varm”, “artig”, “samlad”
  style?: string[]; // “diskret kostym”, “halsduk ibland”
  physical?: string[]; // “runda stålbågade glasögon…”
  tells?: string[]; // repeatable micro-behaviors
};

export type CharacterInnerLife = {
  /**
   * What drives them (the engine).
   * Aim for short, high-signal sentences.
   */
  coreNeed?: string; // “bekräftelse…”
  desire?: string; // what they want now
  fear?: string;
  wound?: string; // formative pain / lack
  contradiction?: string; // “socialt skicklig men identitetslös”
  secret?: string; // what they hide from others/themselves
  belief?: string; // worldview/assumption
};

export type CharacterGoalsAndStakes = {
  goalNow?: string; // immediate
  longGoal?: string; // overarching
  stakes?: string; // what happens if they fail
  obstacles?: string[]; // internal/external
};

export type CharacterBehavior = {
  /**
   * How they behave in scenes.
   * Use lists to keep things snappy and indexable.
   */
  socialStyle?: string[];
  conflictStyle?: string[];
  humorStyle?: string[];
  speechPatterns?: string[];
  decisionMode?: 'reactive' | 'proactive' | 'mixed' | 'unknown';
  triggers?: string[];
};

export type CharacterVoice = {
  /**
   * Voice is very useful for writing consistency and LLM behavior checks.
   */
  register?: string; // formal/informal/poetic
  tempo?: string; // “rytmisk, reflekterande”
  vocabulary?: string[];
  typicalPhrases?: string[];
  avoids?: string[];
};

export type CharacterArc = {
  startState?: string;
  changeVector?: string; // “glider mot kultur…”
  endState?: string;
  keyTurns?: string[];
};

export type CharacterFacts = {
  /**
   * Canon facts you want stable + searchable.
   * Keep factual, not interpretive.
   */
  family?: string;
  residence?: string;
  job?: string;
  resources?: string;
  constraints?: string[];
};

export type CharacterDoc = {
  version: 2;

  id: string;
  tier: CharacterTier;
  status?: CharacterStatus;

  /**
   * Required core.
   */
  identity: CharacterIdentity;

  /**
   * Optional structured sections (guided in UI).
   */
  surface?: CharacterSurface;
  inner?: CharacterInnerLife;
  goals?: CharacterGoalsAndStakes;
  behavior?: CharacterBehavior;
  voice?: CharacterVoice;
  arc?: CharacterArc;
  facts?: CharacterFacts;

  /**
   * Relationships (structured, high-level, expressive).
   */
  relationships?: Relationship[];

  /**
   * A small number of rich blocks (TipTap).
   * For nuance, examples, longer prose.
   */
  rich?: {
    overview?: RichText;
    keyScenes?: RichText;
    sampleDialogue?: RichText;
    notes?: RichText;
  };

  tags?: string[];
  keywords?: string[];

  createdAt?: string;
  updatedAt: string;
};
