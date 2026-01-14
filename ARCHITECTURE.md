# Distil Architecture Documentation

**Technical documentation for developers working on the Distil writing environment**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Layered Contextual Relevance Framework (LCRF)](#layered-contextual-relevance-framework-lcrf)
4. [High-Level Architecture](#high-level-architecture)
   - [Electron Process Architecture](#electron-process-architecture)
   - [Renderer Process Architecture](#renderer-process-architecture)
5. [Component Structure](#component-structure)
6. [Key Patterns](#key-patterns)
7. [Development Notes](#development-notes)

---

## Overview

Distil is a local-first writing environment built on the **Layered Contextual Relevance Framework (LCRF)** — enabling structured, intention-driven co-creation with large language models.

It is an Electron-based desktop application for fiction authors, built with React, TypeScript, Vite, and Mantine UI. The system implements LCRF principles where human intention governs structure, and AI operates as a context-bound cognitive amplifier within explicitly defined contextual layers.

## Core Principles

Distil treats AI as:

> A precision instrument — not an autonomous agent — fully governed by human intention.

This aligns with LCRF principles:
- **Human authority flows down the stack**: Upstream layers always govern downstream behavior
- **AI operates within bounded layers**: The LLM never acts outside the contextual boundaries defined above it
- **Meta-level context reasoning**: The system determines which layers are relevant for each question
- **Explicit human control**: Every layer is defined, validated, and modified by the human author
- **Local-first architecture**: All data stays on the user's machine; no cloud sync or telemetry

This prevents drift, hallucination, and stylistic inconsistency over long creative timelines.

## Layered Contextual Relevance Framework (LCRF)

Distil is a concrete implementation of LCRF, a human-intention–driven architecture for structured collaboration with LLMs. LCRF models creative work as a stack of contextual layers, where each layer constrains and informs the next:

1. **Identity & Governance** — values, voice, tone, constraints (Author Manifest)
2. **Domain & Methodology** — how work is done (system prompts, editor roles, wizard definitions)
3. **Project Intent** — goals, audience, scope, creative direction (Story Brief)
4. **Structured Knowledge** — outlines, worldbuilding, characters, plans
5. **Task Execution** — moment-to-moment writing and problem-solving (Prose editor with AI)

## High-Level Architecture

### Electron Process Architecture

**Main Process** (`electron/main.ts`)
- Creates the app window with custom titlebar (hiddenInset style)
- Registers all IPC handlers for data persistence and OpenAI chat
- Loads the Vite dev server in development, or built files in production

**Preload Script** (`electron/preload.ts`)
- Exposes safe IPC channels to the renderer via `contextBridge`

**Chat Integration** (`electron/chat.ts`)
- Handles OpenAI API calls via IPC (`chat:send`)
- Uses GPT-4.1-mini model
- Caches OpenAI client instances between calls

**Secure Storage** (`electron/secureStore.ts`)
- Uses `keytar` (native credential store) for API key management
- Service name: "Distil", account: "openai_api_key"
- IMPORTANT: keytar is marked as external in vite.config.ts and must not be imported in preload or renderer

**File System** (`electron/fs/fs.ts`)
- All data stored in `~/Distil` directory
- Structure: `~/Distil/projects/{projectId}/stories/{storyId}.json`
- MetaDocs stored separately: `~/Distil/projects/{projectId}/stories/{storyId}-{key}.json`
- Root-level manifest: `~/Distil/manifest.json`

**Chat thread persistence (storage)**
- Chat threads stored as JSON per thread:
  - `~/Distil/chat-threads/{threadId}.json`

**Write Queue**
- Serializes writes to the same resource to prevent race conditions

**Standardized error handling (filesystem + IPC boundary)**
- IPC handlers interacting with filesystem are wrapped in `safeHandle`
- All handlers return a standardized `IpcResponse<T>`:
  - Success: `{ ok: true, data: T }`
  - Failure: `{ ok: false, error: string }`
- Eliminates inconsistent error formats across endpoints and makes frontend handling consistent (`response.ok` checks)

---

### Renderer Process Architecture

**State Management** (`src/state/useAppStore.ts`)
- Uses Zustand for global state
- Manages API key status and metaDocs loading/saving
- MetaDocs system: flexible key-value documents scoped to root/project/story levels
- `metaId(scope, key)` generates unique IDs for caching (e.g., "story:project-123:story-456::outline")

**Navigation State**
- Persisted to localStorage as `Distil:navState:v3`
- Three-level hierarchy: root → project → story
- Section IDs and configuration defined in sections model (`src/models/sections/`)
- Root sections: projects, manifest, playground
- Story sections: prose, brief, outline, world, characters, locations
- App loads last-used navigation state on startup

**Data Model**
- Projects: `{ id, name, createdAt, order }`
- Stories:
  - Single-text form: `{ id, title, createdAt, doc }`
  - Parts-enabled form: `{ id, title, createdAt, partsEnabled: true, parts: PartIndexEntry[] }`
  - **Note:** stories can have **parts enabled** for multi-chapter writing

**Story Parts Model & Projections**
- Stories can be split into chapters/parts for long-form writing with a two-tier storage model:
  - **StoryMetadata** (`story.json`): lightweight metadata + parts index with projections
  - **PartDoc** (`parts/part-{id}.json`): full TipTap/ProseMirror document per chapter
- **PartIndexEntry** (stored inside StoryMetadata):
  - `id`, `order`, `createdAt`, `updatedAt`, `wordCount`, `comment`
  - `projection`: AI-generated summary (with timestamp) used for chapter overview + continuity

**MetaDocs**
- Stored as separate files, loaded on-demand (outline, brief, etc.)
- Manifest: Root-level TipTap document for author's style/tone guide (loaded via `loadRootMetaDoc('manifest')`)

**Editor Architecture**
- Uses TipTap for rich text editing (based on ProseMirror)
- Two editor types: ProseEditor (main story text) and MetaTextEditor (outline/brief/manifest)
- Editor behavior driven by EditorConfig from doc model (heading levels, lists, toolbar items)
- Factory functions convert configs to TipTap extensions and toolbar components
- Documents stored as TipTap JSONContent format
- Markdown conversion utilities in `src/helpers/markdownUtils.ts`

**Document Model System** (`src/models/docs/`) - **LCRF Layer Implementation**
- Centralized, data-driven document configuration defining all doc types and their position in the LCRF stack
- Documents organized by three axes:
  - **Scope**: root / project / story (data organization)
  - **Role**: meta (supporting docs) / primary (the actual story text)
  - **Context Layer**: LCRF layer mapping (author → projectConcept → storyConcept → storyStructure → storyWorld → storyEntities → storyText)
- **Document Type Discrimination**: Uses discriminated union for config types:
  - **RichTextDocConfig**: TipTap-based documents (prose, outline, brief, world, manifest)
  - **EntityIndexDocConfig**: Structured JSON indices for entities (characters, locations)
- Each doc kind includes:
  - LCRF layer assignment (which layer of the stack it belongs to)
  - Editor configuration (heading levels, lists, toolbar items, placeholder) for rich text docs
  - Context guidance for AI (criteria, includes, usage hints)
  - System role definitions (loaded from separate .md files via `systemRoles/`)
  - Context keywords for intelligent selection (multi-language support)
  - Context labels and descriptions
- **Entity Integration**: Characters and locations registered as DocKindIds at `storyEntities` layer
  - Entity indices store lightweight projections (EntityIndex with EntityIndexEntry[])
  - Storage: `{storyId}-characters.json` and `{storyId}-locations.json`
  - EntityIndexDocConfig distinguishes them from rich text documents
- **Derived Context Rules**: `getContextRulesFor(target)` implements LCRF authority flow
  - Upstream layers (higher in the stack) are "always included" for downstream editing
  - Root-scope docs (Identity & Governance) always included in all contexts
  - Story-scope docs intelligently selected based on relevance to current task
- This is the technical implementation of LCRF's layered architecture

**Editor Configuration Model** (`src/models/docs/editorConfig.ts`)
- Data-driven configuration for TipTap editor behavior per document kind
- Defines what editing features are available for each type of document:
  - **headingLevels**: Which HTML heading levels to enable (e.g., [2, 3] for H2/H3)
  - **lists**: Whether to enable bullet and ordered lists
  - **horizontalRule**: Whether to enable horizontal rule separator
  - **toolbar**: Ordered array of toolbar button configurations
  - **placeholder**: Empty editor placeholder text
- Two default configurations:
  - **proseEditorConfig**: Restrictive (H2/H3 only, no lists, minimal toolbar) for prose writing
  - **metaEditorConfig**: Full-featured (H2/H3, lists, horizontal rules, full toolbar) for planning documents
- **editorConfigFactory.tsx**: Factory functions that convert configs into TipTap extensions and React toolbar components
  - `createExtensionsFromConfig()`: Generates TipTap extension array from EditorConfig
  - `createToolbarFromConfig()`: Generates EditorToolbar React element with icons and click handlers
  - Icon mapping uses explicit labels to ensure correct visual representation (H2 vs H3)

**Sections Model** (`src/models/sections/`)
- Centralized registry of all navigation sections in the application
- Defines section configuration for both story-level and root-level navigation
- Sidebar navigation generated dynamically from this model

**AI Chat Integration** (`src/chat/`) - **Meta-Level Context Reasoning**
- **buildChatPrompt.ts**: High-level orchestration that assembles system/assistant/user messages
  - Calls context selector to determine which LCRF layers are relevant
  - Builds from templates with interpolated content
  - Returns structured BuiltPrompt with included context list
- **contextSelector.ts**: Implements meta-level context reasoning (core LCRF principle)
  - Three-stage hybrid strategy:
    1. Model-derived context rules (`getContextRulesFor()`)
    2. Heuristic filtering (keywords via `contextKeywords.ts`)
    3. LLM-based classification (for ambiguous cases)
  - Result: AI receives *just enough context* — no more, no less
- **prompts/buildFromTemplates.ts**: Template-based prompt construction (system/assistant/user)
- **chatHints.ts**: Context-aware suggestion system that guides users through LCRF layer construction
  - Keeps existing chat hints & suggestions behavior (manifest → brief → outline → prose)
- **Chat thread persistence (behavior & message handling)** (`src/hooks/useChatMessages.ts`, `src/ui/chat/ChatAside.tsx`)
  - Chat conversations persist per-document with thread-based storage
  - Thread IDs generated from document scope:
    - `root:{docKind}`
    - `project:{projectId}:{docKind}`
    - `story:{projectId}:{storyId}:{docKind}`
  - Storage location: `~/Distil/chat-threads/{threadId}.json`
  - **Message handling**
    - Regular messages: persisted to disk
    - Ephemeral messages: displayed but excluded from LLM history and storage (e.g., initial hints)
    - Suggestion actions: not persisted; regenerated on load
  - **Loading behavior**
    - Restores messages on thread switch (`skipAnimation: true`)
    - Regenerates initial assistant hints after history loads
    - Seeds hints only after loaded history + text loaded
  - **Reseed triggers**
    - Thread change (new document/section)
    - `docRevision` bump (e.g., wizard inserts content)
    - Document state change (empty → has content)
  - **Storage constraints**
    - Debounced save (1s after changes)
    - Filters out ephemeral messages before saving
    - Keeps last ~100 messages per thread
    - Preserves `actualPrompt` for full context on rehydration

**Wizard System** (`src/wizards/`) - **Formalized Co-Creation Protocols**
- Wizards are structured protocols for building LCRF layers
- Declarative configs; engine is pure/functional with DI and Zustand glue

---

## Component Structure

**Layout** (`src/ui/layout/`)
- `DistilLayout`: Main split-pane container (sidebar + main)
- `Sidebar`: Navigation for projects/stories and story sections, dynamically generated from sections model
- `AppContent`: Main content area with routing based on section component mapping from sections model
- `DistilChrome`: Custom window chrome (minimize/maximize/close buttons)

**Projects** (`src/ui/projects/`)
- Grid view of all projects with drag-to-reorder support (@dnd-kit)

**Editors** (`src/ui/editor/`)
- `WritingEnvironment`: Core editor layout component used by all editing views
  - Owns complete editor lifecycle (creates editor, handles sync, autosave)
  - Integrates TipTap editor, ChatAside, search, markdown extraction
  - Takes `docKind`, `content`, `onUpdate`, `onSave` - fully declarative API
  - Supports custom content injection via `renderEditorContent` prop
  - Used by both MetaTextEditor and StoryTextView
- `MetaTextEditor`: High-level wrapper for meta documents (manifest, brief, outline, world)
  - Loads from Zustand store, passes to WritingEnvironment
  - Simple API: just `scope` + `metaKey`
- `SearchPanel`: Find/replace panel (Cmd+F / Ctrl+F)
- `EditorToolbar`: Formatting toolbar (headings, lists, etc.)

**Stories** (`src/ui/stories/`)
- Grid view of stories within a project
- `StoryTextView`: Main prose editor with **three subview modes**:
  - **Editor mode (default)**: Uses WritingEnvironment for prose editing + chat aside
  - **Chapters overview mode**: chapter list/grid with AI summaries + organization tools
  - **Story preview mode (reading mode)**: clean, non-editable reading view rendering all parts

**Story view modes and navigation**
- **Editor mode**
  - Part previews: previous/next chapter summaries displayed above/below current chapter (clickable navigation)
  - Chapter navigation: bottom bar with previous/next and chapter counter
  - Top menu: add chapter, chapters overview, reading mode, enable chapters
  - Scroll anchoring for smooth navigation
- **Chapters overview mode**
  - Shows chapter cards with projection state (insufficient text / generating / updating / complete)
  - Drag-to-reorder, comments, delete, add new chapters
  - Toggle between view vs organize (sorting) mode
  - Triggers projection generation for current part on mount
- **Story preview mode**
  - Loads all part documents in order (parallel loading)
  - Uses TipTap static renderer (`renderToReactElement`)
  - Inserts chapter titles when multiple parts exist
  - No editing capabilities (pure reading experience)
- Navigation state (current part ID) persisted to localStorage; survives app restarts

**Entities** (`src/ui/story/`)
- `EntityIndexView`: Generic list/edit view for entity collections (characters, locations)
- `EntityEditView`: Schema-driven form renderer for any entity type
- Entity cards displaying lightweight projections from index
- Navigation integration in story sidebar

**Manifest** (`src/ui/manifest/`)
- Root-level editor for author's style/tone guide
- Used as context in all AI writing assistance

**Common** (`src/ui/common/`)
- `EntityCard`, `EntityGrid`: Reusable card/grid components
- `EntityEditModal`: Generic rename/delete modal for projects and stories
- `Modal`: Base modal component

---

## Key Patterns

**Editor Architecture**
- All text editing uses `WritingEnvironment` component
- Three-layer architecture:
  1. **Core hooks** (`src/hooks/`): Reusable editor capabilities
     - `useMarkdownExtraction`: Full text + selection markdown
     - `useEditorSearch`: Search panel state + keyboard shortcuts
     - `useEditorSync`: Syncs TipTap editor with external state
     - `useEditorChat`: Wizard and navigation integration
  2. **WritingEnvironment** (`src/ui/editor/`): Complete editor UI
     - Creates TipTap editor from `docKind` config
     - Handles sync via `onUpdate` callback
     - Handles autosave via `onSave` callback (configurable delay)
     - Integrates search, markdown extraction, chat aside
     - Provides layout (top nav, bottom nav, scroll area, chat)
  3. **Document-specific wrappers**: MetaTextEditor, StoryTextView
     - Load document from storage
     - Provide update/save handlers
     - Manage document-specific features (parts, subviews, etc.)

**Autosave**
- All editors have debounced autosave (configurable via `autosaveDelay` prop)
- **WritingEnvironment** handles autosave internally via `useEffect`
- Default delays:
  - Meta documents: 800ms
  - Prose documents: 1000ms
- Autosave triggers `onSave` callback provided by parent component
- Each metaDoc saves only its own content (~1-10KB) rather than entire story file

**IPC Communication**
- Frontend calls via `client` wrapper (`src/api/client.ts`)
- All calls go through `window.Distil` API exposed by preload
- Pattern: `ipcMain.handle()` in main process, `ipcRenderer.invoke()` in renderer
- **Standardized Response Format**: All IPC calls return `IpcResponse<T>`:
  - Success: `{ ok: true, data: T }`
  - Failure: `{ ok: false, error: string }`
  - All IPC handlers use `safeHandle` wrapper that catches errors automatically
- Consumers check `response.ok` and handle errors explicitly

**MetaDocs System**
- Flexible document system for story metadata (outline, brief, etc.)
- Scoped to root/project/story levels (e.g., `loadStoryMetaDoc`, `loadRootMetaDoc`)
- **Efficient storage**
  - Each metaDoc stored as a separate JSON file (e.g., `{storyId}-outline.json`)
  - Updating outline/brief writes only ~1–10KB instead of rewriting entire story file
  - MetaTextEditor components manage their own state and autosave independently
  - Write queue prevents race conditions when saving the same metaDoc concurrently
- **API deduplication**
  - Root-level docs (like manifest) use the unified API:
    - `loadRootMetaDoc('manifest')` / `saveRootMetaDoc('manifest', doc)`
  - Avoids special-casing (e.g., no separate `loadManifest`/`saveManifest` endpoints)
- Zustand store manages loading/caching with unique IDs generated by `metaId(scope, key)`

**Entities System** (Schema-Driven Architecture)
*(unchanged from prior section; omitted here for brevity in this rewrite—keep your existing Entities System block as-is)*

**Theme Handling**
- Follows system theme (dark/light) via `nativeTheme.shouldUseDarkColors`
- Main process sends theme updates via IPC when system theme changes
- Mantine UI responds to `data-mantine-color-scheme` attribute on root element

---

## Development Notes

### TypeScript Configuration
- Strict mode enabled with all linting flags
- Module resolution: "bundler" (Vite-specific)
- Includes: `["src", "electron"]`
- Target: ES2020

### Styling
- Uses SCSS modules (`src/styles/`)
- Mantine v8 for UI components
- Custom titlebar styling for native macOS feel

### External Dependencies
- **keytar** must remain external (native module for credential storage)
- Cannot be imported in preload or renderer processes
- Only used in main process for secure API key storage

### Data Persistence
- No database; all data in JSON files under `~/Distil`
- Projects and stories maintain `order` field for user-defined sorting
- Reordering operations update all affected files atomically