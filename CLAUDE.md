# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Distil is a local-first writing environment built on the **Layered Contextual Relevance Framework (LCRF)** — enabling structured, intention-driven co-creation with large language models.

It is an Electron-based desktop application for fiction authors, built with React, TypeScript, Vite, and Mantine UI. The system implements LCRF principles where human intention governs structure, and AI operates as a context-bound cognitive amplifier within explicitly defined contextual layers.

## AI Agent Rules for This Project

- When creating plans, also create concrete TODOs and keep them updated
- All TODOs lists, reports, analyses, and auto-generated notes must be placed in `/todos/`.
- Files must use the following naming format: `description.md`.
- Do not put reports or TODOs in root or source directories.

## Layered Contextual Relevance Framework (LCRF)

Distil is a concrete implementation of LCRF, a human-intention–driven architecture for structured collaboration with LLMs. LCRF models creative work as a stack of contextual layers, where each layer constrains and informs the next:

1. **Identity & Governance** — values, voice, tone, constraints (Author Manifest)
2. **Domain & Methodology** — how work is done (system prompts, editor roles, wizard definitions)
3. **Project Intent** — goals, audience, scope, creative direction (Story Brief)
4. **Structured Knowledge** — outlines, worldbuilding, characters, plans
5. **Task Execution** — moment-to-moment writing and problem-solving (Prose editor with AI)

### Core Principles

- **Human authority flows down the stack**: Upstream layers always govern downstream behavior
- **AI operates within bounded layers**: The LLM never acts outside the contextual boundaries defined above it
- **Meta-level context reasoning**: The system determines which layers are relevant for each question
- **Explicit human control**: Every layer is defined, validated, and modified by the human author
- **Local-first architecture**: All data stays on the user's machine; no cloud sync or telemetry

This prevents drift, hallucination, and stylistic inconsistency over long creative timelines.

## Common Commands

### Development
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript and build for production (includes electron-builder)
npm run lint         # Run ESLint on TypeScript/TSX files
npm run preview      # Preview production build
```

### Building
The build process runs: `tsc && vite build && electron-builder`
- TypeScript compilation happens first
- Vite bundles the renderer process
- electron-builder packages the app for distribution

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

**File System** (`electron/fs/DistilFs.ts`)
- All data stored in `~/Distil` directory
- Structure: `~/Distil/projects/{projectId}/stories/{storyId}.json`
- MetaDocs stored separately: `~/Distil/projects/{projectId}/stories/{storyId}-{key}.json`
- Root-level manifest: `~/Distil/manifest.json`
- Handles projects, stories, and "metaDocs" (outline, brief, etc.)
- **Write Queue**: Serializes writes to the same resource to prevent race conditions
- **Standardized Error Handling**: All IPC handlers wrapped with `safeHandle` for consistent error responses

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
- Stories: `{ id, title, createdAt, doc }` - Main prose document only
- MetaDocs: Stored as separate files, loaded on-demand (outline, brief, etc.)
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
- Each doc kind includes:
  - LCRF layer assignment (which layer of the stack it belongs to)
  - Editor configuration (heading levels, lists, toolbar items, placeholder)
  - Context guidance for AI (criteria, includes, usage hints)
  - System role definitions (loaded from separate .md files via `systemRoles/`)
  - Context keywords for intelligent selection (multi-language support)
  - Context labels and descriptions
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
- Benefits:
  - Eliminates duplicate toolbar code across ProseEditor and MetaTextEditor (~40 lines saved)
  - Easy to add new document kinds with different editing capabilities
  - Consistent editor behavior derived from single source of truth

**Sections Model** (`src/models/sections/`)
- Centralized registry of all navigation sections in the application
- Defines section configuration for both story-level and root-level navigation
- Each section includes:
  - **id**: Unique identifier (e.g., 'prose', 'brief', 'outline', 'manifest')
  - **scope**: 'story' or 'root' (determines where section appears in navigation)
  - **docKind**: Optional mapping to document kind in doc model
  - **label**: Display label in sidebar
  - **icon**: Lucide React icon component
  - **order**: Sort order in navigation
  - **component**: Which view component to render
  - **isImplemented**: Whether section is currently functional (shows "coming soon" if false)
- Type derivation:
  - `SectionId`: Union of all section IDs
  - `StorySectionId`: Type-safe subset of story-scope sections
  - `RootSectionId`: Type-safe subset of root-scope sections
- Helper functions:
  - `getStorySections()`: Returns ordered list of story sections, optionally filtered by implementation status
  - `getRootSections()`: Returns ordered list of root sections, with optional dev-mode filtering
  - `getSectionConfig()`: Retrieves config for a specific section
  - `isSectionImplemented()`: Checks if section is fully implemented
- Benefits:
  - Sidebar navigation generated dynamically from model (no hardcoded JSX)
  - AppContent routing simplified using section component mapping
  - Navigation types derived from model ensure type safety
  - Easy to add new sections by updating model only

**AI Chat Integration** (`src/chat/`) - **Meta-Level Context Reasoning**
- **buildPrompt.ts**: High-level orchestration that assembles system/assistant/user messages
  - Calls context selector to determine which LCRF layers are relevant
  - Builds from templates with interpolated content
  - Returns structured BuiltPrompt with included context list
- **contextSelector.ts**: Implements meta-level context reasoning (core LCRF principle)
  - Determines which contextual layers matter for each question
  - Uses `getContextRulesFor()` from doc model to determine always/intelligent inclusion
  - Three-stage approach implementing LCRF's hybrid strategy:
    1. **Model-derived context rules** (LCRF layer ordering from document model)
    2. **Heuristic filtering** (fast keyword signals via `contextKeywords.ts`)
    3. **LLM-based classification** (GPT-4o-mini with structured JSON for ambiguous cases)
  - Result: AI receives *just enough context* — no more, no less
  - Loads and assembles markdown from metaDocs via Zustand store
- **prompts/buildFromTemplates.ts**: Template-based prompt construction
  - System, assistant context, and user prompts built from markdown template files
  - System role varies by doc kind (loaded via `getSystemRoleForDocKind()`)
  - Supports variable interpolation for dynamic content
- **chatHints.ts**: Context-aware suggestion system
  - Guides users through LCRF layer construction (Identity → Project → Structure → Execution)
  - Adapts based on document state (missing/empty/hasContent) and upstream doc availability
  - Suggests creating upstream layers in proper LCRF order (manifest → brief → outline → prose)
  - Strategy pattern: different hints per doc kind
- **actions/**: Reusable suggestion actions (prompts, wizards, navigation commands)

**Wizard System** (`src/wizards/`) - **Formalized Co-Creation Protocols**
- Wizards are not UI helpers — they are **structured protocols for building LCRF layers**
- Help construct the contextual layers that AI later operates within
- Externalize tacit knowledge and structure complex creative decisions
- **Core Architecture**:
  - **engine.ts**: Pure functional engine with dependency injection (no direct DOM/store coupling)
  - **registry.ts**: Dynamic loading of wizard configs from JSON files in `configs/`
  - **types.ts**: Comprehensive type system for wizard configuration and state
  - **navigation.ts**: Step traversal with conditional logic (skipIf support)
  - **storeGlue.ts**: Zustand integration layer
- **Step Types**:
  - **question**: Human-validated input (text, textarea, scale, single/multi-select)
  - **llm-processing**: AI assistance within explicitly bounded context
  - **llm-approval**: Human approval/rejection/edit of AI output (maintains human authority)
  - **compound**: Nested sub-steps with progress tracking
- **Features**:
  - Conditional step skipping based on previous answers
  - Variable interpolation in prompts (e.g., `{{manifest}}`, `{{stepId}}`)
  - Custom output templates for formatting final results
  - Auto-advance for hidden LLM steps
  - Insert results directly into editors
  - Unsaved progress warnings
- **Declarative Configs**: Wizards defined as JSON files, no code changes needed for new wizards
- **LCRF Alignment**: Wizards help build Identity & Governance (manifest), Project Intent (brief), and Structured Knowledge (outlines) layers

### Component Structure

**Layout** (`src/components/layout/`)
- `DistilLayout`: Main split-pane container (sidebar + main)
- `Sidebar`: Navigation for projects/stories and story sections, dynamically generated from sections model
- `AppContent`: Main content area with routing based on section component mapping from sections model
- `DistilChrome`: Custom window chrome (minimize/maximize/close buttons)

**Projects** (`src/components/projects/`)
- Grid view of all projects with drag-to-reorder support (@dnd-kit)

**Stories** (`src/components/stories/`)
- Grid view of stories within a project
- `StoryTextView`: Main prose editor
- `StoryOutlineView`, `StoryBriefView`: MetaDoc editors for story planning

**Manifest** (`src/components/manifest/`)
- Root-level editor for author's style/tone guide
- Used as context in all AI writing assistance

**Common** (`src/components/common/`)
- `EntityCard`, `EntityGrid`: Reusable card/grid components
- `EntityEditModal`: Generic rename/delete modal for projects and stories
- `Modal`: Base modal component

### Key Patterns

**Autosave**
- All editors have debounced autosave (800-1000ms)
- Uses `useEffect` hooks that watch dirty state + content
- **ProseEditor**: Main story prose autosaved from App.tsx when dirty
- **MetaTextEditor**: Outline/brief/manifest editors manage their own autosave independently
- Each metaDoc saves only its own content (~1-10KB) rather than entire story file

**IPC Communication**
- Frontend calls via `DistilClient` wrapper (`src/api/DistilClient.ts`)
- All calls go through `window.Distil` API exposed by preload
- Pattern: `ipcMain.handle()` in main process, `ipcRenderer.invoke()` in renderer
- **Standardized Response Format**: All IPC calls return `IpcResponse<T>`:
  - Success: `{ ok: true, data: T }`
  - Failure: `{ ok: false, error: string }`
- Consumers check `response.ok` and handle errors explicitly

**MetaDocs System**
- Flexible document system for story metadata (outline, brief, characters, etc.)
- Scoped to root/project/story levels (e.g., `loadStoryMetaDoc`, `loadRootMetaDoc`)
- **Storage**: Each metaDoc stored as a separate JSON file (e.g., `{storyId}-outline.json`)
- **Unified API**: Root-level docs (like manifest) use same API: `loadRootMetaDoc('manifest')`
- Zustand store manages loading/caching with unique IDs generated by `metaId(scope, key)`
- Write queue prevents race conditions when saving the same metaDoc concurrently

**Theme Handling**
- Follows system theme (dark/light) via `nativeTheme.shouldUseDarkColors`
- Main process sends theme updates via IPC when system theme changes
- Mantine UI responds to `data-mantine-color-scheme` attribute on root element

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

### Recent Architectural Improvements

**Standardized Error Handling** (Addresses ARCHITECTURE_IMPROVEMENTS.md #8, #9, #19)
- All IPC handlers use `safeHandle` wrapper that catches errors and returns standardized `IpcResponse<T>`
- Eliminated inconsistent error formats across different endpoints
- Frontend explicitly checks `response.ok` and handles errors with console.error logging

**Efficient MetaDoc Storage** (Addresses #12)
- MetaDocs stored as separate files instead of inline in story files
- Updating outline/brief now writes only ~1-10KB instead of entire story file (potentially MBs)
- MetaTextEditor components manage their own state and autosave independently
- Write queue prevents race conditions when saving the same resource concurrently

**API Deduplication** (Addresses #18)
- Removed duplicate `loadManifest`/`saveManifest` IPC APIs
- Manifest now accessed via unified `loadRootMetaDoc('manifest')`/`saveRootMetaDoc('manifest', doc)` API
- Eliminated 100+ lines of duplicate code across type definitions, handlers, and client code

**Document Model Refactoring** (LCRF Implementation)
- Introduced centralized document model system (`src/models/docs/`) as technical implementation of LCRF layers
- All document types (manifest, brief, outline, world, prose) now defined via data-driven configuration with LCRF layer assignments
- Context rules automatically derived from LCRF hierarchy (scope, role, context layer)
- AI guidance (system roles, context criteria, keywords) embedded in model and loaded from markdown files
- Eliminates hardcoded context logic scattered across codebase
- Makes LCRF layer structure explicit and enforceable in code

**Intelligent Context Selection** (Meta-Level Context Reasoning)
- Implements LCRF's core principle: determine which layers matter for each question
- Hybrid approach: model-derived rules + keyword heuristics + LLM classification for ambiguous cases
- Uses doc model's context keywords and criteria for consistent behavior
- Falls back to GPT-4o-mini for cases where heuristics show low confidence
- Reduces token usage by only including relevant LCRF layers
- Ensures AI receives just enough context — no more, no less

**Chat Hints & Suggestions** (LCRF Layer Construction Guidance)
- Context-aware suggestion system guides users through LCRF layer construction
- Adapts based on document state (missing/empty/hasContent) and upstream layer availability
- Suggests logical next steps following LCRF order (Identity → Project Intent → Structured Knowledge → Execution)
- Enforces proper dependency flow: manifest → brief → outline → prose
- Reusable action system supports prompts, wizards, and navigation commands

**Wizard Framework** (Formalized Co-Creation Protocols)
- Complete multi-step workflow system for building LCRF layers
- Wizards help construct the contextual layers that AI later operates within
- Pure functional engine with dependency injection for testability
- Declarative JSON configs enable new wizards without code changes
- Four step types: question (human input), llm-processing (bounded AI assistance), llm-approval (human authority), compound (nesting)
- Conditional navigation, template interpolation, and custom output formatting
- Currently powers manifest starter and outline builder workflows
- Reflects LCRF principle that AI helps construct the layers it later operates within

**Sections Model** (Model-Driven Navigation)
- Introduced centralized section registry (`src/models/sections/`) for all navigation configuration
- Sidebar navigation now generated dynamically from model instead of hardcoded JSX (eliminated ~11 hardcoded NavItem components)
- AppContent routing simplified using section-to-component mapping with type-safe section IDs
- Navigation types (`StorySectionId`, `RootSectionId`) derived from model ensure type safety
- Each section includes scope, label, icon, component mapping, and implementation status
- Easy to add new sections by updating model only, no component changes needed

**Editor Configuration Model** (Data-Driven Editor Behavior)
- Introduced editor configuration system (`src/models/docs/editorConfig.ts`, `editorConfigFactory.tsx`)
- Each document kind now defines its editor behavior (heading levels, lists, toolbar items) in the doc model
- Factory functions convert EditorConfig to TipTap extensions and React toolbar components
- Eliminated ~40 lines of duplicate toolbar code across ProseEditor and MetaTextEditor
- Fixed toolbar icon bug where heading level logic didn't match prose editor's actual levels
- Easy to customize editor behavior per document kind without touching component code

## Development Philosophy

Distil treats AI as:

> A precision instrument — not an autonomous agent — fully governed by human intention.

This aligns with LCRF principles:
- **Humans provide**: meaning, direction, judgment, authority
- **LLMs provide**: abstraction, structure, synthesis, cognitive amplification
- **Authority flows down**: upstream LCRF layers always govern downstream behavior
- **Bounded operation**: AI never acts outside contextual boundaries defined above it
- **Explicit control**: every layer defined, validated, and modified by humans

This design prevents drift, hallucination, and stylistic inconsistency over long creative timelines, enabling long-horizon AI-assisted creativity with sustained coherence.
