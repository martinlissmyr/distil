// src/state/useAppStore.ts
import { create } from 'zustand';
import { client } from '../api/client';
import { metaJsonToMarkdown } from '../helpers/markdownUtils';
import type { MetaScope, MetaDocKey, MetaDocState } from '../types/metaDoc';
import type { UiSchemaSetting } from '../types/ui';
import { DEFAULT_UI_SCHEMA_SETTING, SUPPORTED_UI_SCHEMA_SETTINGS } from '../types/ui';

import type {
  WizardState,
  WizardActions,
} from '../wizards/types';
import { createWizardActions } from '../wizards/storeGlue';

import type { WritingLanguage } from '../types/language';
import {
  DEFAULT_WRITING_LANGUAGE,
  SUPPORTED_WRITING_LANGUAGES,
} from '../types/language';
import type { StoryMetadata } from '../models/story';

type ApiState = { hasApiKey: boolean | null };

type AppStore = {
  api: ApiState;
  metaDocs: Record<string, MetaDocState>; // id -> state
  wizardResult: string | null; // Result from completed wizard

  // ---- Writing language ----
  writingLanguage: WritingLanguage;
  writingLanguageLoaded: boolean;
  loadWritingLanguage: () => Promise<void>;
  setWritingLanguage: (lang: WritingLanguage) => Promise<void>;

  // ---- UI Schema Setting -----
  uiSchemaSetting: UiSchemaSetting;
  uiSchemaLoaded: boolean;
  loadUiSchema: () => Promise<void>;
  setUiSchemaSetting: (v: UiSchemaSetting) => Promise<void>;

  setHasApiKey: (v: boolean) => void;

  getMetaDoc: (scope: MetaScope, key: MetaDocKey) => MetaDocState | undefined;

  ensureMetaDocsLoaded: (scope: MetaScope, keys: MetaDocKey[]) => Promise<void>;

  updateMetaDoc: (scope: MetaScope, key: MetaDocKey, json: any) => void;

  saveMetaDoc: (scope: MetaScope, key: MetaDocKey) => Promise<void>;

  // ---- Per-document revision (used to trigger hint reseeds etc.) ----
  docRevision: Record<string, number>;
  bumpDocRevision: (docId: string) => void;
  getDocRevision: (docId: string) => number;

  // ---- Story parts state ----
  currentStoryMetadata: StoryMetadata | null;
  currentPartIdMap: { [storyId: string]: string };
  currentPartDoc: any | null; // TipTap JSONContent for current part

  loadStoryMetadata: (projectId: string, storyId: string) => Promise<void>;
  loadStoryForView: (projectId: string, storyId: string, options?: { restorePartId?: string }) => Promise<void>;
  getCurrentPartId: (storyId: string) => string | undefined;
  setCurrentPartId: (storyId: string, partId: string | null) => void;
  loadCurrentPartDoc: (projectId: string, storyId: string, partId: string) => Promise<void>;

  enableParts: (projectId: string, storyId: string) => Promise<void>;
  createPart: (projectId: string, storyId: string, order: number) => Promise<string>;
  deletePart: (projectId: string, storyId: string, partId: string) => Promise<void>;
  reorderParts: (projectId: string, storyId: string, partIds: string[]) => Promise<void>;
  updatePartComment: (projectId: string, storyId: string, partId: string, comment: string) => Promise<void>;

} & WizardState &
  WizardActions;

// helper to get a unique id
export const metaId = (scope: MetaScope, key: MetaDocKey) => {
  if (scope.scope === 'root') return `root::${key}`;
  if (scope.scope === 'project') return `project:${scope.projectId}::${key}`;
  return `story:${scope.projectId}:${scope.storyId}::${key}`;
};

// ✅ Use this for revisions for meta docs (same id)
export const docIdForMeta = metaId;

// ✅ Use this for primary docs (prose etc.) – adjust if you have a better canonical id
export const docIdForPrimary = (args: {
  kind: string; // e.g. 'prose'
  projectId?: string;
  storyId?: string;
}) => {
  const { kind, projectId, storyId } = args;
  if (projectId && storyId) return `story:${projectId}:${storyId}::${kind}`;
  // fallback (should be rare)
  return `root::${kind}`;
};

const isSupportedUiSchemaSetting = (v: unknown): v is UiSchemaSetting => {
  return (
    typeof v === 'string' &&
    (SUPPORTED_UI_SCHEMA_SETTINGS as readonly string[]).includes(v)
  );
};

const isSupportedWritingLanguage = (v: unknown): v is WritingLanguage => {
  return (
    typeof v === 'string' &&
    (SUPPORTED_WRITING_LANGUAGES as readonly string[]).includes(v)
  );
};

export const useAppStore = create<AppStore>((set, get) => ({
  api: { hasApiKey: null },

  metaDocs: {},

  wizardResult: null,

  // Wizard state (kept in the store)
  activeWizard: null,
  wizardContext: null,

  // ---- Writing language (default sv) ----
  writingLanguage: DEFAULT_WRITING_LANGUAGE,
  writingLanguageLoaded: false,

  // ---- Per-document revision ----
  docRevision: {},

  bumpDocRevision: (docId) =>
    set((s) => ({
      docRevision: {
        ...s.docRevision,
        [docId]: (s.docRevision[docId] ?? 0) + 1,
      },
    })),

  getDocRevision: (docId) => get().docRevision[docId] ?? 0,

  // ---- Story parts state ----
  currentStoryMetadata: null,
  currentPartIdMap: {},
  currentPartDoc: null,

  uiSchemaSetting: DEFAULT_UI_SCHEMA_SETTING,
  uiSchemaLoaded: false,

  async loadUiSchema() {
    if (get().uiSchemaLoaded) return;

    try {
      const resp = await client.getUiSchema();
      if (resp.ok) {
        const value = resp.data;
        if (isSupportedUiSchemaSetting(value)) {
          set({ uiSchemaSetting: value, uiSchemaLoaded: true });
        } else {
          set({ uiSchemaSetting: DEFAULT_UI_SCHEMA_SETTING, uiSchemaLoaded: true });
        }
      } else {
        console.error('[useAppStore] getUiSchema failed:', resp.error);
        set({ uiSchemaSetting: DEFAULT_UI_SCHEMA_SETTING, uiSchemaLoaded: true });
      }
    } catch (e) {
      console.error('[useAppStore] Failed to load uiSchema', e);
      set({ uiSchemaSetting: DEFAULT_UI_SCHEMA_SETTING, uiSchemaLoaded: true });
    }
  },

  async setUiSchemaSetting(next) {
    if (!isSupportedUiSchemaSetting(next)) {
      throw new Error(`Unsupported ui schema setting: ${String(next)}`);
    }

    const prev = get().uiSchemaSetting;

    // optimistic update => immediate UI change everywhere
    set({ uiSchemaSetting: next, uiSchemaLoaded: true });

    try {
      const resp = await client.setUiSchema(next);
      if (!resp.ok) {
        set({ uiSchemaSetting: prev, uiSchemaLoaded: true });
        throw new Error(resp.error);
      }
    } catch (e) {
      set({ uiSchemaSetting: prev, uiSchemaLoaded: true });
      throw e instanceof Error ? e : new Error('Failed to set UI schema');
    }
  },

  async loadWritingLanguage() {
    // Avoid re-loading if already loaded
    if (get().writingLanguageLoaded) return;

    try {
      const response = await client.getWritingLanguage();
      if (response.ok) {
        const value = response.data;
        if (isSupportedWritingLanguage(value)) {
          set({ writingLanguage: value, writingLanguageLoaded: true });
        } else {
          // Unexpected persisted value -> fallback
          set({
            writingLanguage: DEFAULT_WRITING_LANGUAGE,
            writingLanguageLoaded: true,
          });
        }
      } else {
        console.error(
          '[useAppStore] getWritingLanguage failed:',
          response.error
        );
        set({
          writingLanguage: DEFAULT_WRITING_LANGUAGE,
          writingLanguageLoaded: true,
        });
      }
    } catch (e) {
      console.error('[useAppStore] Failed to load writingLanguage', e);
      set({ writingLanguage: DEFAULT_WRITING_LANGUAGE, writingLanguageLoaded: true });
    }
  },

  async setWritingLanguage(lang) {
    // Guard (also helps if callers cast incorrectly)
    if (!isSupportedWritingLanguage(lang)) {
      throw new Error(`Unsupported writing language: ${String(lang)}`);
    }

    const prev = get().writingLanguage;

    // Optimistic update so UI reacts instantly
    set({ writingLanguage: lang, writingLanguageLoaded: true });

    try {
      const response = await client.setWritingLanguage(lang);
      if (!response.ok) {
        // Revert on failure
        set({ writingLanguage: prev, writingLanguageLoaded: true });
        throw new Error(response.error);
      }
    } catch (e) {
      // Revert on failure
      set({ writingLanguage: prev, writingLanguageLoaded: true });
      throw e instanceof Error ? e : new Error('Failed to set writing language');
    }
  },

  setHasApiKey: (hasApiKey) => set({ api: { hasApiKey } }),

  getMetaDoc(scope, key) {
    return get().metaDocs[metaId(scope, key)];
  },

  async ensureMetaDocsLoaded(scope, keys) {
    const promises = keys.map(async (key) => {
      const id = metaId(scope, key);
      const existing = get().metaDocs[id];
      if (existing && (existing.json || existing.isLoading)) return;

      // optimistic
      set((state) => ({
        metaDocs: {
          ...state.metaDocs,
          [id]: {
            scope,
            key,
            json: existing?.json ?? null,
            markdown: existing?.markdown ?? null,
            isLoading: true,
            error: null,
          },
        },
      }));

      try {
        let json: any | null = null;

        if (scope.scope === 'root') {
          const response = await client.loadRootMetaDoc(key);
          if (response.ok) {
            json = response.data;
          } else {
            throw new Error(response.error);
          }
        } else if (scope.scope === 'project') {
          // Project-level metaDocs not implemented yet — no-op for now
          console.warn(
            '[useAppStore] Project metaDocs not implemented yet:',
            scope.projectId,
            key
          );
          json = null;
        } else {
          // story-level metaDocs (brief, outline, etc)
          const response = await client.loadStoryMetaDoc(
            scope.projectId,
            scope.storyId,
            key
          );
          if (response.ok) {
            json = response.data;
          } else {
            throw new Error(response.error);
          }
        }

        const markdown = json ? metaJsonToMarkdown(json) : '';

        set((state) => ({
          metaDocs: {
            ...state.metaDocs,
            [id]: {
              scope,
              key,
              json,
              markdown,
              isLoading: false,
              error: null,
            },
          },
        }));
      } catch (err: unknown) {
        console.error('ensureMetaDocsLoaded error', err);
        set((state) => ({
          metaDocs: {
            ...state.metaDocs,
            [id]: {
              scope,
              key,
              json: null,
              markdown: null,
              isLoading: false,
              error:
                err instanceof Error ? err.message : 'Failed to load meta doc',
            },
          },
        }));
      }
    });

    await Promise.all(promises);
  },

  updateMetaDoc(scope, key, json) {
    const id = metaId(scope, key);
    const markdown = metaJsonToMarkdown(json);
    set((state) => ({
      metaDocs: {
        ...state.metaDocs,
        [id]: {
          scope,
          key,
          json,
          markdown,
          isLoading: false,
          error: null,
        },
      },
    }));
  },

  async saveMetaDoc(scope, key) {
    const id = metaId(scope, key);
    const docState = get().metaDocs[id];
    if (!docState?.json) return;

    if (scope.scope === 'root') {
      const response = await client.saveRootMetaDoc(key, docState.json);
      if (!response.ok) {
        console.error('[useAppStore] saveRootMetaDoc failed:', response.error);
        throw new Error(response.error);
      }
    } else if (scope.scope === 'project') {
      // placeholder for future project-level metaDocs
      console.warn(
        '[useAppStore] saveMetaDoc: project metaDocs not implemented yet:',
        scope.projectId,
        key
      );
    } else {
      const response = await client.saveStoryMetaDoc(
        scope.projectId,
        scope.storyId,
        key,
        docState.json
      );
      if (!response.ok) {
        console.error('[useAppStore] saveStoryMetaDoc failed:', response.error);
        throw new Error(response.error);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Story parts actions
  // ---------------------------------------------------------------------------
  async loadStoryMetadata(projectId, storyId) {
    const response = await client.loadStoryMetadata(projectId, storyId);
    if (response.ok) {
      const metadata = response.data;
      set({ currentStoryMetadata: metadata });

      const currentPartId = get().currentPartIdMap[storyId];
      console.log('[METADATA] currentPartId for story', storyId, 'when loadStoryMetadata called:', currentPartId);

      if (currentPartId) {
        // If there IS a current part ID, validate it exists in metadata
        console.log('[METADATA] Validating currentPartId exists in metadata');
        const partExists = metadata.parts.some((p) => p.id === currentPartId);
        if (!partExists) {
          console.warn(`Part ${currentPartId} not found in metadata for story ${storyId}, clearing part state`);
          const { [storyId]: _, ...rest } = get().currentPartIdMap;
          set({ currentPartIdMap: rest, currentPartDoc: null });
        }
      }
      // Fallback logic removed - use loadStoryForView() for initial story loading
    } else {
      console.error('[useAppStore] loadStoryMetadata failed:', response.error);
      throw new Error(response.error);
    }
  },

  getCurrentPartId(storyId) {
    return get().currentPartIdMap[storyId];
  },

  setCurrentPartId(storyId, partId) {
    console.log('[STORE] setCurrentPartId called for story', storyId, 'with:', partId);
    const currentMap = get().currentPartIdMap;
    if (partId === null) {
      // Remove entry if partId is null
      const { [storyId]: _, ...rest } = currentMap;
      set({ currentPartIdMap: rest });
    } else {
      // Add or update entry
      set({ currentPartIdMap: { ...currentMap, [storyId]: partId } });
    }
    // Note: Navigation store is updated separately by StoryTextView for persistence
    // loadCurrentPartDoc will be called separately by the action that changes partId
  },

  async loadCurrentPartDoc(projectId, storyId, partId) {
    console.log('[STORE] loadCurrentPartDoc called for part:', partId);
    const response = await client.loadPartDoc(projectId, storyId, partId);
    if (response.ok) {
      console.log('[STORE] Loaded part doc, setting currentPartDoc for part:', partId);
      set({ currentPartDoc: response.data.doc });
    } else {
      console.error('[useAppStore] loadCurrentPartDoc failed:', response.error);
      // Set to empty doc on error
      set({ currentPartDoc: { type: 'doc', content: [] } });
    }
  },

  async loadStoryForView(projectId, storyId, options) {
    console.log('[STORE] loadStoryForView called for story:', storyId, 'options:', options);

    // 1. Load metadata
    const response = await client.loadStoryMetadata(projectId, storyId);
    if (!response.ok) {
      console.error('[useAppStore] loadStoryForView: loadStoryMetadata failed:', response.error);
      throw new Error(response.error);
    }

    const metadata = response.data;

    // 2. Determine which part to show (priority order)
    let targetPartId: string | null = null;

    if (metadata.parts.length > 0) {
      // Priority 1: Explicit restore option
      if (options?.restorePartId) {
        const partExists = metadata.parts.some(p => p.id === options.restorePartId);
        if (partExists) {
          targetPartId = options.restorePartId;
          console.log('[STORE] loadStoryForView: Using restorePartId:', targetPartId);
        } else {
          console.warn('[STORE] loadStoryForView: restorePartId not found in metadata, falling back');
        }
      }

      // Priority 2: Already in store
      if (!targetPartId) {
        const storePartId = get().currentPartIdMap[storyId];
        if (storePartId) {
          const partExists = metadata.parts.some(p => p.id === storePartId);
          if (partExists) {
            targetPartId = storePartId;
            console.log('[STORE] loadStoryForView: Using store currentPartId:', targetPartId);
          }
        }
      }

      // Priority 3: First part (fallback)
      if (!targetPartId) {
        targetPartId = metadata.parts[0].id;
        console.log('[STORE] loadStoryForView: Using first part as fallback:', targetPartId);
      }
    }

    // 3. Set store state using proper setState (not direct mutation)
    if (targetPartId) {
      set({
        currentStoryMetadata: metadata,
        currentPartIdMap: { ...get().currentPartIdMap, [storyId]: targetPartId }
      });

      // 4. Load part document
      await get().loadCurrentPartDoc(projectId, storyId, targetPartId);
    } else {
      // No parts yet - set empty state
      set({
        currentStoryMetadata: metadata,
        currentPartDoc: null
      });
      // Remove this story from the part ID map
      const { [storyId]: _, ...restMap } = get().currentPartIdMap;
      set({ currentPartIdMap: restMap });
    }

    console.log('[STORE] loadStoryForView completed for story:', storyId, 'part:', targetPartId);
  },

  async enableParts(projectId, storyId) {
    const metadata = get().currentStoryMetadata;
    if (!metadata) {
      throw new Error('No story metadata loaded');
    }

    // Update metadata to enable parts
    const updatedMetadata: StoryMetadata = {
      ...metadata,
      partsEnabled: true,
    };

    const response = await client.saveStoryMetadata(projectId, storyId, updatedMetadata);
    if (response.ok) {
      set({ currentStoryMetadata: updatedMetadata });

      // If no parts exist yet, create the first one
      if (updatedMetadata.parts.length === 0) {
        await get().createPart(projectId, storyId, 0);
      }
    } else {
      console.error('[useAppStore] enableParts failed:', response.error);
      throw new Error(response.error);
    }
  },

  async createPart(projectId, storyId, order) {
    const response = await client.createPart(projectId, storyId, order);

    if (response.ok) {
      const newPart = response.data;

      // Reload metadata to get updated parts array
      await get().loadStoryMetadata(projectId, storyId);

      // Load the new part's document
      await get().loadCurrentPartDoc(projectId, storyId, newPart.id);

      return newPart.id;
    } else {
      console.error('[useAppStore] createPart failed:', response.error);
      throw new Error(response.error);
    }
  },

  async deletePart(projectId, storyId, partId) {
    const response = await client.deletePart(projectId, storyId, partId);
    if (response.ok) {
      // If deleting current part, switch to first available part and load its doc
      if (get().currentPartIdMap[storyId] === partId) {
        const metadata = get().currentStoryMetadata;
        if (metadata && metadata.parts.length > 1) {
          const otherPart = metadata.parts.find((p) => p.id !== partId);
          if (otherPart) {
            set({ currentPartIdMap: { ...get().currentPartIdMap, [storyId]: otherPart.id } });
            await get().loadCurrentPartDoc(projectId, storyId, otherPart.id);
          }
        } else {
          const { [storyId]: _, ...rest } = get().currentPartIdMap;
          set({ currentPartIdMap: rest, currentPartDoc: null });
        }
      }

      // Reload metadata to get updated parts array
      await get().loadStoryMetadata(projectId, storyId);
    } else {
      console.error('[useAppStore] deletePart failed:', response.error);
      throw new Error(response.error);
    }
  },

  async reorderParts(projectId, storyId, partIds) {
    const response = await client.reorderParts(projectId, storyId, partIds);
    if (response.ok) {
      // Reload metadata to get updated parts array
      await get().loadStoryMetadata(projectId, storyId);
    } else {
      console.error('[useAppStore] reorderParts failed:', response.error);
      throw new Error(response.error);
    }
  },

  async updatePartComment(projectId: string, storyId: string, partId: string, comment: string) {
    const metadata = get().currentStoryMetadata;
    if (!metadata) {
      throw new Error('No story metadata loaded');
    }

    // Update the part's comment
    const updatedParts = metadata.parts.map(part =>
      part.id === partId
        ? { ...part, comment, updatedAt: new Date().toISOString() }
        : part
    );

    const updatedMetadata: StoryMetadata = {
      ...metadata,
      parts: updatedParts,
      updatedAt: new Date().toISOString(),
    };

    const response = await client.saveStoryMetadata(projectId, storyId, updatedMetadata);
    if (response.ok) {
      set({ currentStoryMetadata: updatedMetadata });
    } else {
      console.error('[useAppStore] updatePartComment failed:', response.error);
      throw new Error(response.error);
    }
  },

  // ---------------------------------------------------------------------------
  // Wizard actions (delegated out of the store; store only owns wizard state)
  // ---------------------------------------------------------------------------
  ...createWizardActions({
    set,
    get,
    sendChat: (args) => window.chat.send(args),
  }),
}));