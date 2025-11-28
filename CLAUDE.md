# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alinea is an Electron-based desktop writing application for fiction authors, built with React, TypeScript, Vite, and Mantine UI. It provides a prose editor with AI-powered writing assistance using OpenAI's API.

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
- Root-level manifest: `~/Alinea/manifest.json`
- Handles projects, stories, and "metaDocs" (outline, brief, etc.)

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
- Stories: `{ id, title, createdAt, order, doc, metaDocs }`
- MetaDocs: flexible Record<string, JSONContent> for outline, brief, etc.
- Manifest: root-level TipTap document for author's style/tone guide

**Editor Architecture**
- Uses TipTap for rich text editing (based on ProseMirror)
- Two editor types: ProseEditor (main story text) and MetaTextEditor (outline/brief/manifest)
- Documents stored as TipTap JSONContent format
- Markdown conversion utilities in `src/state/markdownUtils.ts`

**AI Chat Integration** (`src/chat/buildPrompt.ts`)
- Builds context-aware prompts based on editor type (prose/manifest/outline/brief)
- Always includes: current document, user's manifest (style guide), and optionally text selection
- Prose mode uses sophisticated "Alinea Writing Partner" system prompt focused on literary co-writing
- Prompts detect user language and respond accordingly

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
- Story saves include all sections (doc, outlineDoc, briefDoc) to maintain consistency

**IPC Communication**
- Frontend calls via `alineaClient` wrapper (`src/api/alineaClient.ts`)
- All calls go through `window.alinea` API exposed by preload
- Pattern: `ipcMain.handle()` in main process, `ipcRenderer.invoke()` in renderer

**MetaDocs System**
- Flexible document system for story metadata (outline, brief, characters, etc.)
- Scoped to root/project/story levels
- Stored inline in story JSON files as `metaDocs: { [key]: JSONContent }`
- Zustand store manages loading/caching with unique IDs

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
