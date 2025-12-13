# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alinea is an Electron-based desktop writing application for fiction authors, built with React, TypeScript, Vite, and Mantine UI. It provides a prose editor with AI-powered writing assistance using OpenAI's API.

## AI Agent Rules for This Project

- When creating plans, also create concrete TODOs and keep them updated
- All TODOs lists, reports, analyses, and auto-generated notes must be placed in `/todos/`.
- Files must use the following naming format: `description.md`.
- Do not put reports or TODOs in root or source directories.

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
- Service name: "alinea", account: "openai_api_key"
- IMPORTANT: keytar is marked as external in vite.config.ts and must not be imported in preload or renderer

**File System** (`electron/fs/alineaFs.ts`)
- All data stored in `~/Alinea` directory
- Structure: `~/Alinea/projects/{projectId}/stories/{storyId}.json`
- MetaDocs stored separately: `~/Alinea/projects/{projectId}/stories/{storyId}-{key}.json`
- Root-level manifest: `~/Alinea/manifest.json`
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
- Persisted to localStorage as `alinea:navState:v3`
- Three-level hierarchy: root → project → story
- Root sections: projects, manifest, assistant
- Story sections: prose, outline, brief, characters, locations
- App loads last-used navigation state on startup

**Data Model**
- Projects: `{ id, name, createdAt, order }`
- Stories: `{ id, title, createdAt, doc }` - Main prose document only
- MetaDocs: Stored as separate files, loaded on-demand (outline, brief, etc.)
- Manifest: Root-level TipTap document for author's style/tone guide (loaded via `loadRootMetaDoc('manifest')`)

**Editor Architecture**
- Uses TipTap for rich text editing (based on ProseMirror)
- Two editor types: ProseEditor (main story text) and MetaTextEditor (outline/brief/manifest)
- Documents stored as TipTap JSONContent format
- Markdown conversion utilities in `src/helpers/markdownUtils.ts`

**Document Model System** (`src/models/docs/`)
- Centralized, data-driven document configuration defining all doc types (manifest, brief, outline, world, prose)
- Documents organized by three axes:
  - **Scope**: root / project / story
  - **Role**: meta (supporting docs) / primary (the actual story text)
  - **Context Layer**: hierarchical ordering (author → projectConcept → storyConcept → storyStructure → storyWorld → storyEntities → storyText)
- Each doc kind includes:
  - Context guidance for AI (criteria, includes, usage hints)
  - System role definitions (loaded from separate .md files via `systemRoles/`)
  - Context keywords for intelligent selection (multi-language support)
  - Context labels and descriptions
- **Derived Context Rules**: `getContextRulesFor(target)` automatically determines which docs to include when editing a given doc
  - Upstream docs are "always included" for meta docs
  - Root-scope docs always included, story-scope docs intelligently selected for prose
- Replaces scattered hardcoded context logic with a single source of truth

**AI Chat Integration** (`src/chat/`)
- **buildPrompt.ts**: High-level orchestration that assembles system/assistant/user messages
  - Calls context selector to get relevant docs
  - Builds from templates with interpolated content
  - Returns structured BuiltPrompt with included context list
- **contextSelector.ts**: Hybrid intelligent context selection
  - Uses `getContextRulesFor()` from doc model to determine always/intelligent inclusion
  - Two-stage approach: fast keyword heuristics → LLM classification for ambiguous cases
  - Heuristics check language-specific keywords (via `contextKeywords.ts`)
  - LLM classification uses GPT-4o-mini with structured JSON output when confidence is low
  - Loads and assembles markdown from metaDocs via Zustand store
- **prompts/buildFromTemplates.ts**: Template-based prompt construction
  - System, assistant context, and user prompts built from markdown template files
  - System role varies by doc kind (loaded via `getSystemRoleForDocKind()`)
  - Supports variable interpolation for dynamic content
- **chatHints.ts**: Context-aware suggestion system
  - Provides hints and suggested actions when chat opens
  - Adapts based on document state (missing/empty/hasContent) and upstream doc availability
  - Suggests creating upstream docs (manifest → brief → outline) in proper order
  - Strategy pattern: different hints per doc kind
- **actions/**: Reusable suggestion actions (prompts, wizards, navigation commands)

**Wizard System** (`src/wizards/`)
- Multi-step guided workflow framework for complex document creation tasks
- **Core Architecture**:
  - **engine.ts**: Pure functional engine with dependency injection (no direct DOM/store coupling)
  - **registry.ts**: Dynamic loading of wizard configs from JSON files in `configs/`
  - **types.ts**: Comprehensive type system for wizard configuration and state
  - **navigation.ts**: Step traversal with conditional logic (skipIf support)
  - **promptInterpolator.ts**: Template interpolation with access to answers, llmResults, and metaDocs
  - **storeGlue.ts**: Zustand integration layer
- **Step Types**:
  - **question**: User input (text, textarea, scale, single/multi-select)
  - **llm-processing**: Background AI processing with optional approval UI
  - **llm-approval**: Show LLM result and get user approval/rejection/edit
  - **compound**: Nested sub-steps with progress tracking
- **Features**:
  - Conditional step skipping based on previous answers
  - Variable interpolation in prompts (e.g., `{{manifest}}`, `{{stepId}}`)
  - Custom output templates for formatting final results
  - Auto-advance for hidden LLM steps
  - Insert results directly into editors
  - Unsaved progress warnings
- **Declarative Configs**: Wizards defined as JSON files, no code changes needed for new wizards

### Component Structure

**Layout** (`src/components/layout/`)
- `AlineaLayout`: Main split-pane container (sidebar + main)
- `Sidebar`: Navigation for projects/stories and story sections
- `AlineaChrome`: Custom window chrome (minimize/maximize/close buttons)

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
- Frontend calls via `alineaClient` wrapper (`src/api/alineaClient.ts`)
- All calls go through `window.alinea` API exposed by preload
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
- No database; all data in JSON files under `~/Alinea`
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

**Document Model Refactoring**
- Introduced centralized document model system (`src/models/docs/`) as single source of truth
- All document types (manifest, brief, outline, world, prose) now defined via data-driven configuration
- Context rules automatically derived from document hierarchy (scope, role, context layer)
- AI guidance (system roles, context criteria, keywords) embedded in model and loaded from markdown files
- Eliminates hardcoded context logic scattered across codebase

**Intelligent Context Selection**
- Hybrid approach: fast keyword heuristics + LLM classification for ambiguous cases
- Uses doc model's context keywords and criteria for consistent behavior
- Falls back to GPT-4o-mini (gpt-4o-mini) for cases where heuristics show low confidence
- Reduces token usage by only including relevant context documents

**Chat Hints & Suggestions**
- Context-aware suggestion system guides users through document creation workflow
- Adapts based on document state (missing/empty/hasContent) and upstream dependencies
- Suggests logical next steps (manifest → brief → outline → prose)
- Reusable action system supports prompts, wizards, and navigation commands

**Wizard Framework**
- Complete multi-step workflow system for guided document creation
- Pure functional engine with dependency injection for testability
- Declarative JSON configs enable new wizards without code changes
- Four step types: question, llm-processing, llm-approval, compound
- Conditional navigation, template interpolation, and custom output formatting
- Currently powers manifest starter and outline builder workflows
