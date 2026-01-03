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

## Architecture

### Schema DSL System
Entities use a **lightweight schema definition system** inspired by Sanity CMS. All entity structure is defined in `src/models/entities/schemas/`:

**Core Schema Types** (`schemas/types.ts`):
- **FieldDef**: Defines individual fields with:
  - `name`: Field path (supports nesting like `"identity.name"`)
  - `label`, `description`, `placeholder`: UI copy
  - `type`: `'text' | 'textarea' | 'select'` (determines input component)
  - `group`: Optional semantic grouping
  - `schema`: Zod validation (single source of truth)
  - `minRows`, `options`: UI hints for textarea/select types
  - `includeInProjection`: Hint for projection inclusion
- **GroupDef**: Semantic field grouping with label and description
- **DocumentTypeDef**: Complete document schema with name, version, groups, and fields
- Helper functions: `defineField()` and `defineType()` for type-safe definitions

**Entity Schemas**:
- **character.ts**: Character schema with identity and role groups
  - Identity fields: name, aliases
  - Role fields: tier (primary/significant/secondary), roleInStory
  - Body fields: presenceAndExpression, voiceSamples, innerOrientation, sensitivityAndPull, externalConstraints
  - All fields optional except name
- **location.ts**: Location schema (similar pattern)

**Zod Schema Generation** (`src/helpers/buildZodFromSchema.ts`):
- Converts DSL schema to Zod object schema
- Supports nested paths: `"identity.name"` expands to `{ identity: { name: z.string() } }`
- Single source of truth for validation
- Generates `CharacterDocSchema` and `LocationDocSchema`

**Entity Document Types**:
- Generated from schemas: `CharacterDoc = z.infer<typeof CharacterDocSchema>`
- Base metadata: `id`, `version`, `updatedAt`, `createdAt`
- Nested structure from field paths (e.g., `identity: { name, aliases }`)
- All fields except `id`, `version`, `updatedAt` are optional

### EntityIndex Simplification
The **EntityIndex** is now minimal:
- **EntityIndexEntry** contains only: `id`, `name`, `docRef`, `sortOrder`
- No complex projections in current implementation
- Lightweight and regenerable from entity docs
- Stored at: `{storyId}-characters.json`, `{storyId}-locations.json`

### Persistence Strategy

**Principle: one file per entity**
Entities should be editable in isolation and safe to persist independently of the main story document.

**Storage location** (aligns with existing patterns):
```
~/Distil/projects/<projectId>/stories/<storyId>/entities/
  characters/
    <characterId>.json    # Full CharacterDoc (future)
  locations/
    <locationId>.json     # Full LocationDoc (future)

# Current storage (entity indices only):
~/Distil/projects/<projectId>/stories/<storyId>/
  <storyId>-characters.json    # EntityIndex
  <storyId>-locations.json     # EntityIndex
```

**Rationale:**
- Follows existing pattern where story-scoped data lives under `stories/<storyId>/`
- Similar to how metaDocs are stored
- Keeps all story-related data (prose, outline, brief, entities) under one story path
- Index remains lightweight and can be regenerated from entity docs

**Write Queue Integration**:
Entity saves use the existing write queue system (`electron/fs/fs.ts`) to prevent race conditions.

### Document Model Integration

**Relationship to existing document model**:
Entities are **not** registered as doc kinds in the core document model (`src/models/docs/`). Instead, they are a **parallel subsystem** with their own schema and persistence patterns.

**Why separate from doc model:**
- **Multiple instances**: Unlike docs (one manifest, one brief, one outline per story), there are many characters and locations per story
- **Structured schemas**: Entities use schema DSL with Zod validation rather than free-form TipTap JSONContent
- **Index-based retrieval**: Entities use a projection/index pattern for context selection, unlike docs which are loaded individually
- **Custom UI patterns**: Entity editing uses schema-driven forms, not just TipTap rich text editors

**Entities follow similar architectural patterns:**
- **LCRF layer assignment** (Layer 4: Structured Knowledge)
- **Story-scoped persistence** under `stories/<storyId>/`
- **Write queue usage** to prevent race conditions
- **Context participation** via `getContextRulesFor()` integration
- **State management** via Zustand store with loading/caching

**Context Rules Integration**:
Entities extend the existing context selection algorithm (`src/chat/contextSelector.ts`):

- **For `storyText` editing**: Characters and locations are **intelligently selected** based on:
  - Heuristic matching (names, aliases mentioned in recent prose or user question)
  - Relationship relevance (if asking about character interactions)
  - Location relevance (if scene is set in a specific place)

- **For entity editing**: Upstream context (manifest, brief, world) is **always included**. Other entities may be included if relationships/connections are relevant.

The entity relevance pipeline (heuristics → rules → optional LLM classification → fetch full docs) integrates with the existing three-stage context selection approach.

---

## Benefits of Schema-Based Approach

The schema DSL provides a **single source of truth** for entity structure, validation, and UI behavior:

### 1. **Declarative Structure**
- All entity fields, groups, and metadata defined in one place
- Type-safe definitions with `defineField()` and `defineType()` helpers
- Easy to understand and modify without touching component code

### 2. **Automatic Type Generation**
- TypeScript types derived from Zod schemas: `CharacterDoc = z.infer<typeof CharacterDocSchema>`
- Full type safety from schema → validation → storage → UI
- No manual type synchronization needed

### 3. **Unified Validation**
- Zod schemas embedded in field definitions
- Single validation source used for both client-side and storage layer
- Consistent error messages and validation behavior

### 4. **Dynamic Form Rendering**
- UI forms generated from schema groups and fields
- `FieldDef.type` determines input component (TextInput, Textarea, Select)
- Adding/modifying fields only requires schema updates, no component changes
- Labels, descriptions, placeholders all defined in schema

### 5. **Schema Evolution**
- Version field enables migration strategies
- Easy to add new fields without breaking existing data
- Clear upgrade paths when schema structure changes

### 6. **Self-Documenting**
- Field labels and descriptions serve as inline documentation
- Schema structure communicates intent to both humans and AI assistants
- Reduces need for separate documentation files

### 7. **Extensibility**
- Easy to add new entity types (locations, items, factions)
- Consistent pattern for all entity schemas
- Future features (projections, indexing hints) can be added to FieldDef without breaking changes

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
  order: 50,
  component: StoryCharactersView,
  isImplemented: true,
},
{
  id: 'locations',
  scope: 'story',
  docKind: undefined,
  label: 'Locations',
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

TBD

[Additional sections as relevant to context...]
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

## Implementation Status

### ✅ IMPLEMENTED

**Schema DSL System**:
- ✅ Core schema types: FieldDef, GroupDef, DocumentTypeDef (`schemas/types.ts`)
- ✅ Helper functions: `defineField()`, `defineType()` for type-safe definitions
- ✅ Character schema with identity, role, and body groups (`schemas/character.ts`)
- ✅ Nested field path support (e.g., `"identity.name"`)
- ✅ Zod schema generation from DSL (`buildZodFromSchema.ts` helper)
- ✅ CharacterDoc and CharacterDocSchema generated from schema
- ✅ Field metadata: labels, descriptions, placeholders, UI types, validation

**Helper Utilities**:
- ✅ Nested object utilities (`helpers/nestedObjectUtils.ts`): `getNestedValue()`, `setNestedValue()`
- ✅ Zod helpers (`helpers/zodHelpers.ts`): `isZodFieldRequired()`, `getZodDefault()`, `getRequiredFields()`
- ✅ Schema-driven validation in EntityEditView using `getRequiredFields()` from schema
- ✅ Clean separation: navigation utilities in nestedObjectUtils, validation utilities in zodHelpers

## Projection System

**Purpose**: Lightweight markdown representations for context selection (avoids loading full entity docs)

**Template-based approach**:
- Templates stored as `.md` files in `src/models/entities/projectionTemplates/`
- Current templates: `character.projection.md`, `location.projection.md`
- Templates define human-readable markdown format for entities in AI prompts

**Template syntax**:
- Uses `interpolate()` helper from `src/helpers/stringUtils.ts`
- Variable interpolation: `{{variableName}}` (e.g., `{{identity.name}}`, `{{role.tier}}`)
- Conditional sections: `{{#if hasContent(field)}}...{{/if}}` - hides empty sections
- Example: `{{#if hasContent(body.voiceSamples)}}` only shows voice section when content exists

**Generation**:
- `buildEntityProjectionMarkdown()` in `src/models/entities/entityProjectionUtils.ts`
- Takes entity doc + entity type, returns formatted markdown string
- Loads appropriate template for entity type
- Interpolates entity field values into template
- Evaluates conditionals to hide empty sections

**Storage**:
- `projection` field in `EntityIndexEntry` (optional)
- Stored in entity index files: `{storyId}-characters.json`, `{storyId}-locations.json`
- Not authoritative - can always be regenerated from entity docs

**Trigger**:
- Auto-generated when entity is saved via EntityIndexView
- EntityEditView calls `buildEntityProjectionMarkdown()` after successful save
- Updates entity index with new projection
- Ensures projections stay in sync with entity docs

**Benefits**:
- **Token-efficient**: Only includes fields marked with `includeInProjection: true` in schema
- **Flexible**: Templates can be edited without code changes - just modify `.md` files
- **Context-aware**: `hasContent()` conditionals hide empty sections, reducing noise
- **Regenerable**: Derived from entity docs, not authoritative - can be rebuilt at any time
- **Human-readable**: Markdown format matches existing context system patterns

**Core Data Model**:
- ✅ EntityIndex type with simplified EntityIndexEntry (id, name, docRef, sortOrder only)
- ✅ CharacterDoc structure generated from character schema
- ✅ Entity integration into document model via discriminated union
- ✅ EntityIndexDocConfig distinguishes entity indices from rich text docs
- ✅ Characters and locations registered as DocKindIds at `storyEntities` LCRF layer

**Storage & Persistence**:
- ✅ Entity index storage at `{storyId}-characters.json` and `{storyId}-locations.json`
- ✅ Entity document storage at `stories/entities/{entityType}s/{entityId}.json`
- ✅ Write queue integration for atomic saves (both index and docs)
- ✅ Separate storage: lightweight index for lists, full docs for editing

**IPC Layer**:
- ✅ `entity:loadIndex` handler (loads entity index from disk)
- ✅ `entity:saveIndex` handler (saves entity index with write queue protection)
- ✅ `entity:load` handler (loads individual entity document)
- ✅ `entity:save` handler (saves individual entity document)
- ✅ Standardized error handling with `IpcResponse<T>` pattern
- ✅ Client wrapper methods in `src/api/client.ts`
- ✅ Type definitions in `src/global.d.ts`

**State Management**:
- ✅ Zustand store integration for entity indices
- ✅ Loading/caching with unique entity index IDs
- ✅ `loadEntityIndex` and `saveEntityIndex` actions

**UI Components**:
- ✅ EntityIndexView component (generic list/edit view for any entity type)
- ✅ EntityEditView component (schema-driven form renderer)
- ✅ Entity cards in grid view
- ✅ Navigation integration (Characters and Locations sections in story sidebar)
- ✅ Character fields: identity (name, aliases), role (tier, roleInStory), body fields (presence, voice, orientation, sensitivity, constraints, relationships)
- ✅ Location schema with identity and role groups
- ✅ SCSS module improvements: inline styles refactored to proper module structure

**Schema-Driven Form Rendering**:
- ✅ EntityEditView component renders forms dynamically from DocumentTypeDef schema
- ✅ Generates form sections from schema groups using SettingsGroup components
- ✅ Maps FieldDef.type to input components (TextInput, Textarea, Select)
- ✅ Handles nested field paths (e.g., "identity.name")
- ✅ Extracts default values from Zod schema definitions
- ✅ Applies schema validation on save via generated Zod schemas
- ✅ Benefits: Adding/modifying fields only requires schema changes, no component updates
- ✅ Works identically for characters and locations

**Full Entity Document Storage**:
- ✅ IPC handlers: `entity:load`, `entity:save` (in `electron/handlers/entities.ts`)
- ✅ File system functions: `loadEntityDoc()`, `saveEntityDoc()` (in `electron/fs/fs.ts`)
- ✅ Storage pattern: `~/Distil/projects/{projectId}/stories/entities/{entityType}s/{entityId}.json`
- ✅ Full entity doc validation using generated Zod schemas before save
- ✅ Write queue protection for concurrent saves
- ✅ Separate from entity index - index stores minimal projections (id, name, docRef)

**Current Implementation Summary**:
- ✅ Character creation, editing, and storage fully functional with schema-driven UI
- ✅ Full character schema implementation with relationships field (free-text format for LLM-friendly flexibility)
- ✅ Location schema defined and ready for use (same pattern as characters)
- ✅ Entity indices store lightweight projections (id, name, docRef) for efficient list views
- ✅ Full entity docs stored separately with complete field data
- ✅ Two-tier storage model: index for lists, full docs for editing
- ✅ Schema DSL as single source of truth for structure, validation, and UI metadata
- ✅ EntityEditView dynamically renders forms for any entity type from schema
- ✅ CharacterDoc and LocationDoc types auto-generated from schemas
- ✅ Helper utilities for nested object navigation and Zod schema introspection
- ✅ File storage with atomic writes and race condition protection
- ✅ Properly positioned at `storyEntities` layer in LCRF hierarchy
- ✅ Relationships field included in entity projections for context selection
- ✅ Projection system fully implemented: template-based markdown generation for AI context
- ✅ Auto-generation of projections on entity save with conditional sections for empty fields

---

## 🚧 FUTURE WORK

### Immediate Next Steps

**Character Schema Enhancements**:
- ✅ Relationships field added to character schema (body group)
- Note: Free-text approach chosen over structured relationship model for:
  - LLM-friendly natural language format
  - Flexibility in describing complex relationship dynamics
  - Simpler implementation avoiding bidirectional sync complexity
  - Easier for authors to write and edit
- Future: Consider structured relationship tracking if needed for advanced features

### Location Implementation

**Location Schema & UI**:
- Define LocationDoc schema with appropriate groups and fields
- Location editing UI using same schema-driven form pattern
- Location index storage and retrieval
- Navigation integration

### Advanced Schema Features

**Schema Evolution**:
- Version migration system for schema changes
- Validation and migration of old CharacterDocs to new schema versions
- Backwards compatibility for entity docs with outdated schemas

### Context Integration

**Entity Context for AI Prompts**:
- Entity context formatting for AI prompts (markdown serialization)
- Heuristic filtering based on entity relevance
- LLM-based entity selection for ambiguous cases
- Entity-specific ephemeral messages and hints

### Entity Advanced Features

**Advanced Features**:
- Entity consistency checking
- Entity search and filtering
- Serialization modes (structured, fullMarkdown, projection)
- Entity templates based on archetypes

---