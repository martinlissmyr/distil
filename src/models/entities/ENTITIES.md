# ENTITIES.md

This document describes the **Entities** subsystem in Distil: the data model, storage strategy, UI patterns, chat/context integration, and how to evolve the feature safely. It is written as implementation guidance for both humans and coding assistants (Claude/ChatGPT).

> Scope: **story-scoped entities** (currently `character` and `location`), editable in isolation, persistable on disk, and selectively retrievable as context for chat/wizards.

---

## Goals

### Product goals
- Let authors create and maintain **structured** entities (not one big free text blob).
- Make entities **editable in isolation**, with clean navigation and autosave.
- Support **selective retrieval**: fetch only the subset of entities needed to answer a question (instead of dumping all characters/locations into prompts).
- Provide **guidance**: per-field prompts, placeholders, and “what to write here” scaffolding.

### Technical goals
- Local-first: entities are **safely persisted** on disk.
- Minimize merge/race issues: writes should be **atomic** and queued like existing docs/metaDocs.
- Ensure scalable context: entity content used in AI prompts must be **budget-aware**.
- Keep index and docs in sync: index is derived from docs and can be regenerated.

---

## LCRF Layer Assignment

Entities belong to **Layer 4: Structured Knowledge** in the LCRF stack, specifically:
- **Character entities** → `storyEntities` context
- **Location entities** → `storyEntities` context

Both are downstream from and informed by upstream layers.

### Context Inclusion Rules (LCRF Authority Flow)

**When editing character or location entities:**
- **Always included** (upstream layers govern downstream):
  - **Layer 1: Identity & Governance** → Manifest (root-level author voice/values)
  - **Layer 3: Project Intent** → Story Brief (story concept, goals, audience)
  - **Layer 4: Structured Knowledge** → World metadoc (rules, norms, constraints of story universe)
- **Intelligently selected** (peer layer):
  - Other characters/locations (based on relationships, relevance)

**When editing prose (storyText):**
- **Always included**: Manifest, Brief, Outline, World
- **Intelligently selected**: Characters, Locations (based on context relevance)

This reflects the core LCRF principle: **upstream layers always govern downstream behavior**. World defines what's possible; characters and locations exist within those boundaries; prose execution operates within all established constraints.

### Layer Hierarchy
```
Layer 1: Manifest (author identity)
         ↓ (governs)
Layer 3: Story-level concept (Brief)
         ↓ (governs)
Layer 4: Story Structure (Outline)
         ↓ (informs)
Layer 6: World (universe rules)
         ↓ (informs)
Layer 6: Characters & Locations ← ENTITIES (downstream from world)
         ↓ (constrain)
Layer 7: Prose (task execution)
```

---

## Core Concepts

### EntityDoc (source of truth)
An **EntityDoc** is the canonical, structured representation of a single entity (e.g. one character). It is stored independently and is the primary editing object.

- `characterDoc` – identity, behavior, voice, relationships, arc, etc.
- `locationDoc` – setting, mood, function, hazards, etc.

**Rule:** EntityDoc is authoritative. Nothing else should contain full entity docs inline.

### EntityIndex (signals-only)
An **EntityIndex** is a story-scoped list of lightweight entries (“projections”) derived from entity docs.

- It exists to support:
  - quick lookup (names / aliases)
  - fast “is this relevant?” decisions
  - smart context selection / retrieval planning
- It must never contain long prose or full entity documents.

**Rule:** EntityIndex is derived and can always be regenerated from stored EntityDocs.

---

## Abstract Concepts (Author-Facing Semantics)

### LCRF Context
These concepts are part of **Layer 4: Structured Knowledge** (specifically `storyEntities` context) in the LCRF stack. They represent **author-defined constraints** that govern downstream AI behavior during **Layer 5: Task Execution** (prose writing).

This reflects the core LCRF principle: **upstream layers always govern downstream behavior**. The contradictions, relationships, triggers, and arcs defined here constrain what the AI suggests during prose editing — preventing drift, hallucination, and character inconsistency.

---

The following concepts appear throughout the entity models. They are **not technical fields**, but narrative tools. The UI and AI should treat them as *signals*, not as rigid taxonomies.

### RelationshipDomain
**What it is:**  
A high-level domain describing *what kind of bond* exists between two characters.

Examples:
- `romantic`
- `family`
- `professional`
- `power`
- `ideological`
- `social`
- `community`
- `sexual`

**How to think about it:**  
Domains answer *“In what sphere does this relationship primarily operate?”*  
A relationship can span multiple domains (e.g. `romantic + power`, or `family + ideological`).

**How it’s used:**
- Helps AI reason about likely behavior and tension.
- Helps retrieve relevant relationships for questions like:
  - “Who holds power over X?”
  - “Is this a romantic betrayal or a professional one?”

---

### RelationshipValence
**What it is:**  
The *emotional direction* or stance of the relationship.

Common values:
- `supportive` – fundamentally reinforcing, even if imperfect
- `conflicted` – mixed, unstable, ambivalent
- `antagonistic` – opposing, hostile, undermining
- `neutral` – functional but emotionally flat
- `unknown` – deliberately undefined

**Example (romantic + supportive):**
- Mutual care, trust, or loyalty — even if quiet or restrained.

**Example (romantic + conflicted):**
- Desire mixed with resentment, dependency, fear, or self-denial.

**How it’s used:**
- Strong signal for consistency checks:
  - “Would X confide this?”
  - “Would X challenge Y here?”
- Helps AI detect tonal mismatches.

---

### Strength (Relationship Strength)
**What it is:**  
A scalar (0..1) representing *how much this relationship matters* in the story.

**Important:**  
Strength is *not* moral closeness or affection. It is **narrative weight**.

Examples:
- A bitter rivalry may have **high strength**.
- A pleasant acquaintance may have **low strength**.
- A community tie (e.g. shared circles) may have **medium strength** even without intimacy.

**Friendship vs community vs acquaintance**
- **Acquaintance**: low strength, narrow domain.
- **Friendship**: moderate-to-high strength, personal domain.
- **Community**: medium strength, broad domain (many shared spaces, norms).

---

### Archetype
**What it is:**  
A shorthand *narrative role-pattern*, not a personality box.

Examples:
- “the mask”
- “the investigator”
- “the witness”
- “the double”
- “the caretaker”

**How to think about it:**  
Archetype answers *“What story-function does this character tend to perform?”*  
It should **not** fully describe the character — it’s a lens, not a cage.

**How it’s used:**
- Helps AI reason about expected pressures and behaviors.
- Helps the author maintain thematic clarity.

---

### SettingAnchor
**What it is:**  
A short phrase anchoring the character in *place + time + social context*.

Examples:
- “Berlin, late Weimar period”
- “Upper-middle-class urban household”
- “Provincial cultural elite”

**How it’s used:**
- Provides grounding for dialogue, behavior, and plausibility.
- Helps AI avoid anachronisms or tonal drift.

---

### Contradiction
**What it is:**  
A *core internal tension* that defines the character.

Format:
- “X, but Y”
- “Capable of A, incapable of B”

Examples:
- “Socially skilled but internally empty”
- “Morally rigid but emotionally avoidant”

**How to think about it:**  
Contradiction is often the **engine of scenes**.  
If nothing contradicts, nothing moves.

---

### Obstacles
**What it is:**  
Forces preventing the character from achieving goals.

Types:
- Internal (fear, belief, wound)
- External (other characters, institutions, environment)

**How it’s used:**
- Helps AI reason about believable failure or delay.
- Supports consistency checks:
  - “Why doesn’t X just do Y?”

---

### Triggers
**What it is:**  
Specific stimuli that reliably provoke a shift in behavior or emotion.

Examples:
- Being publicly questioned
- Certain words or topics
- Authority figures
- Silence
- Praise

**How it’s used:**
- High-value signal for scene writing.
- Useful for detecting character-consistent reactions.

---

### Avoids
**What it is:**  
Topics, behaviors, or emotional territories the character systematically avoids.

Examples:
- Conflict
- Introspection
- Speaking about the past
- Making promises

**How it’s used:**
- Helps AI avoid putting words/actions in a character’s mouth that feel wrong.
- Useful in dialogue validation:
  - “Would X really say this?”

---

### CharacterArc
**What it is:**  
The *directional change* of the character across the story.

Components:
- `startState` – who they are at entry
- `changeVector` – how they are pulled or pushed
- `endState` – who they become (or fail to become)
- `keyTurns` – moments that lock change in place

**Important:**  
An arc can be **subtle**, **incomplete**, or **tragically circular**.

**How it’s used:**
- Guides long-range consistency.
- Helps AI reason about “early vs late” behavior.

---

## Persistence Strategy

### Principle: one file per entity
Entities should be editable in isolation and safe to persist independently of the main story document.

### Storage location (aligns with existing patterns)
Entities are story-scoped and stored within the story's directory hierarchy:

```
~/Distil/projects/<projectId>/stories/<storyId>/entities/
  characters/
    <characterId>.json
  locations/
    <locationId>.json
  index.json
```

**Rationale:**
- Follows existing pattern where story-scoped data lives under `stories/<storyId>/`
- Similar to how metaDocs might be stored, but with subdirectories for organization
- Keeps all story-related data (prose, outline, brief, entities) under one story path
- `index.json` remains lightweight and can be regenerated from entity docs

### Write Queue Integration
Entity saves must use the existing write queue system (implemented in `electron/fs/fs.ts`) to prevent race conditions when multiple entities or the index are saved concurrently.

---

## Document Model Integration

### Relationship to existing document model
Entities are **not** registered as doc kinds in the core document model (`src/models/docs/`). Instead, they are a **parallel subsystem** with their own schema and persistence patterns.

**Why separate from doc model:**
- **Multiple instances**: Unlike docs (one manifest, one brief, one outline per story), there are many characters and locations per story
- **Structured schemas**: Entities use typed TypeScript interfaces (e.g., `CharacterDoc`, `LocationDoc`) rather than free-form TipTap JSONContent
- **Index-based retrieval**: Entities use a projection/index pattern for context selection, unlike docs which are loaded individually
- **Custom UI patterns**: Entity editing may use structured forms, not just TipTap rich text editors

### However, entities follow similar architectural patterns:
- **LCRF layer assignment** (Layer 4: Structured Knowledge)
- **Story-scoped persistence** under `stories/<storyId>/`
- **Write queue usage** to prevent race conditions
- **Context participation** via `getContextRulesFor()` integration
- **State management** via Zustand store with loading/caching

### Context Rules Integration
Entities extend the existing context selection algorithm (`src/chat/contextSelector.ts`):

- **For `storyText` editing**: Characters and locations are **intelligently selected** based on:
  - Heuristic matching (names, aliases mentioned in recent prose or user question)
  - Relationship relevance (if asking about character interactions)
  - Location relevance (if scene is set in a specific place)

- **For entity editing**: Upstream context (manifest, brief, world) is **always included**. Other entities may be included if relationships/connections are relevant.

The entity relevance pipeline (heuristics → rules → optional LLM classification → fetch full docs) integrates with the existing three-stage context selection approach.

---

## IPC API Surface

Entity operations follow the standardized IPC patterns established in `electron/fs/fs.ts`:

### Proposed API
```typescript
// Load individual entity
ipcMain.handle('entity:load',
  safeHandle(async (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string) => {
    // Returns IpcResponse<CharacterDoc | LocationDoc>
  })
);

// Save individual entity
ipcMain.handle('entity:save',
  safeHandle(async (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string, doc: EntityDoc) => {
    // Uses write queue, returns IpcResponse<void>
  })
);

// Load entity index
ipcMain.handle('entity:loadIndex',
  safeHandle(async (projectId: string, storyId: string) => {
    // Returns IpcResponse<EntityIndex>
  })
);

// List entity projections (for UI grids/lists)
ipcMain.handle('entity:list',
  safeHandle(async (projectId: string, storyId: string, entityType?: 'character' | 'location') => {
    // Returns IpcResponse<EntityProjection[]>
  })
);

// Delete entity
ipcMain.handle('entity:delete',
  safeHandle(async (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string) => {
    // Deletes doc and updates index, returns IpcResponse<void>
  })
);
```

### Client wrapper
Add to `src/api/client.ts`:
```typescript
export const client = {
  // ... existing methods ...

  entities: {
    load: (projectId: string, storyId: string, entityType: EntityType, entityId: string) =>
      window.distil.invoke('entity:load', projectId, storyId, entityType, entityId),

    save: (projectId: string, storyId: string, entityType: EntityType, entityId: string, doc: EntityDoc) =>
      window.distil.invoke('entity:save', projectId, storyId, entityType, entityId, doc),

    loadIndex: (projectId: string, storyId: string) =>
      window.distil.invoke('entity:loadIndex', projectId, storyId),

    list: (projectId: string, storyId: string, entityType?: EntityType) =>
      window.distil.invoke('entity:list', projectId, storyId, entityType),

    delete: (projectId: string, storyId: string, entityType: EntityType, entityId: string) =>
      window.distil.invoke('entity:delete', projectId, storyId, entityType, entityId),
  },
};
```

All handlers wrapped with `safeHandle` for consistent error responses following `IpcResponse<T>` pattern.

---

## State Management

### Zustand Store Integration
Entity state is managed via Zustand (`src/state/useAppStore.ts`) following patterns similar to metaDocs:

```typescript
// Proposed additions to useAppStore
interface AppStore {
  // ... existing state ...

  // Entity cache: entityId → EntityDoc
  entities: Record<string, CharacterDoc | LocationDoc>;

  // Entity index cache: storyId → EntityIndex
  entityIndexes: Record<string, EntityIndex>;

  // Loading states
  entitiesLoading: Record<string, boolean>;
  indexesLoading: Record<string, boolean>;

  // Actions
  loadEntity: (projectId: string, storyId: string, entityType: EntityType, entityId: string) => Promise<void>;
  saveEntity: (projectId: string, storyId: string, entityType: EntityType, entityId: string, doc: EntityDoc) => Promise<void>;
  loadEntityIndex: (projectId: string, storyId: string) => Promise<void>;
  deleteEntity: (projectId: string, storyId: string, entityType: EntityType, entityId: string) => Promise<void>;
}
```

### Cache Keys
Entity cache keys follow the pattern:
- Individual entities: `${entityType}:${entityId}` (e.g., `character:char-123`)
- Entity indexes: `entityIndex:${storyId}` (e.g., `entityIndex:story-456`)

### Write Queue
Entity saves automatically use the existing write queue system in `fs.ts`:
- Multiple saves to the same entity are serialized
- Index updates are queued separately
- Prevents race conditions during concurrent editing

### Autosave Behavior
Entity editors follow existing autosave patterns:
- **Debounce delay**: 1000ms (1 second) after last edit
- **Dirty state tracking**: Component tracks unsaved changes
- **Auto-save on unmount**: Save before navigating away
- **Save confirmation**: Visual indicator when save completes

---

## Navigation & UI Integration

### Sections Model Integration
Entities integrate with the sections model (`src/models/sections/`) by adding new story-scope sections:

```typescript
// Proposed additions to src/models/sections/index.ts
{
  id: 'characters',
  scope: 'story',
  docKind: undefined, // No single docKind — multiple character docs exist
  label: 'Characters',
  icon: Users, // from lucide-react
  order: 50,
  component: StoryCharactersView,
  isImplemented: true,
},
{
  id: 'locations',
  scope: 'story',
  docKind: undefined,
  label: 'Locations',
  icon: MapPin, // from lucide-react
  order: 60,
  component: StoryLocationsView,
  isImplemented: true,
},
```

### Navigation Flow
```
1. User navigates to "Characters" section in sidebar
   → StoryCharactersView renders grid of character cards (from entity index)

2. User clicks a character card
   → A dedicated sub-view opens
   → Loads full CharacterDoc from Zustand/IPC
   → Renders structured editor (mix of inputs (text, select etc) and TipTap editors)

3. User edits character fields
   → Changes tracked in local state
   → Autosave after 1000ms debounce
   → Calls client.entities.save()

4. User closes editor / goes back
   → If unsaved changes, prompt to save
   → Return to grid view
   → Grid refreshes from updated entity index
```

### UI Components (proposed structure)
```
src/components/entities/
  StoryCharactersView.tsx     # Grid view of all characters
  StoryLocationsView.tsx      # Grid view of all locations
  CharacterEditor.tsx         # Full character editing form
  LocationEditor.tsx          # Full location editing form
  EntityCard.tsx              # Reusable card for grids
  EntityEditView.tsx          # wrapper for editors
  fields/
    RelationshipField.tsx     # Structured relationship editor
    VoiceField.tsx            # Voice/dialogue editor
    ArcField.tsx              # Character arc editor
    # ... other specialized field editors
```

### Editor Configuration
Entity fields use a **hybrid approach**:
- **Short structured fields**: Standard text inputs, selects, sliders (e.g., name, archetype, strength)
- **Longer prose fields**: TipTap editors with minimal config (e.g., voice description, behavior patterns)
- **Specialized fields**: Custom components (e.g., relationship graph, arc timeline)

TipTap fields use a simplified `entityEditorConfig`:
```typescript
const entityEditorConfig: EditorConfig = {
  headingLevels: [3], // H3 only for sub-sections within fields
  lists: true,
  horizontalRule: false,
  toolbar: ['bold', 'italic', 'bulletList', 'orderedList'],
  placeholder: 'Describe this aspect...',
};
```

---

## Chat Integration

### Integration with Existing Context Selection
Entity context selection extends the existing three-stage approach in `src/chat/contextSelector.ts`:

**Stage 1: Model-derived rules** (from LCRF layer hierarchy)
- When editing `storyText`: Characters and locations are **intelligently selected** (not always included)
- When editing entities themselves: Upstream docs (manifest, brief, world) are **always included**, related entities **intelligently selected**

**Stage 2: Heuristic filtering** (keyword-based signals)
- Entity-specific heuristics:
  - Character name/alias appears in user question or recent prose
  - Location name appears in current scene context
  - Relationship keywords trigger related character inclusion ("Why does X distrust Y?")
  - Voice/dialogue keywords trigger character voice inclusion

**Stage 3: LLM-based classification** (for ambiguous cases)
- Uses entity index projections (not full docs) for classification
- GPT-4o-mini determines relevance based on:
  - Entity projection signals (archetype, core traits, relationship valences)
  - User question semantics
  - Current editing context

**Stage 4: Fetch full EntityDocs** (only for confirmed relevant entities)
- Full character/location docs loaded only after relevance confirmed
- Converted to markdown context for inclusion in AI prompts
- Budget-aware: limits on number of entities included

### Context Keywords Extension
Add to `src/chat/contextKeywords.ts`:
```typescript
export const contextKeywords = {
  // ... existing keywords ...

  storyEntities: {
    en: [
      'character', 'protagonist', 'antagonist', 'voice', 'dialogue',
      'personality', 'behavior', 'motivation', 'relationship', 'dynamic',
      'arc', 'development', 'who is', 'what does X want', 'why does X',
      'consistency', 'portrayal', 'characterization',
    ],
    sv: [/* Swedish equivalents */],
  },

  storyWorld: {
    en: [
      'location', 'place', 'setting', 'where', 'scene', 'environment',
      'atmosphere', 'mood', 'world', 'geography', 'space',
    ],
    sv: [/* Swedish equivalents */],
  },
};
```

### Entity-Specific Context Formatting
When entities are included in AI prompts, they're formatted as structured markdown:

```markdown
# CHARACTER: <name>

**Archetype**: <archetype>
**Setting Anchor**: <settingAnchor>

## Core Contradiction
<contradiction>

## Voice & Behavior
<voice>

## Key Relationships
- **<otherName>** (<domain>, <valence>, strength: <0-1>): <dynamic>

## Triggers & Avoids
**Triggers**: <triggers>
**Avoids**: <avoids>

[Additional sections as relevant to context...]
```

### What "ephemeral" means
- Ephemeral messages **must render in UI**.
- They **must never be sent as LLM history**.
- They exist purely for guidance, hints, and suggested actions.

### Ephemeral Messages for Entity Guidance
When entity context is relevant but not fully loaded:

```typescript
{
  type: 'ephemeral',
  content: 'This question involves **3 characters** (Alice, Bob, Carol). Loading their profiles...',
  actions: [
    { type: 'wizard', wizardId: 'character-consistency-check', label: 'Check character consistency' },
    { type: 'navigate', target: { section: 'characters' }, label: 'View characters' },
  ],
}
```

---

## Wizards Integration

Entities are ideal wizard targets:
- “Define character voice”
- “Map relationship dynamics”
- “Detect contradictions in portrayal”

Wizard outputs should:
- Prefer structured fields.
- Patch, not overwrite.
- Summarize changes for the author.

---

## Guiding Principles

- **Structure beats blobs**, but nuance still matters.
- **Signals first**, prose second.
- **Editable in isolation**, retrievable in context.
- **Index is cheap, docs are precious.**
- **Nothing should surprise the author or the model.**

---