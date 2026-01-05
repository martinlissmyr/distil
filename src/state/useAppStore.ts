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
  currentPartId: string | null;

  loadStoryMetadata: (projectId: string, storyId: string) => Promise<void>;
  setCurrentPartId: (partId: string | null) => void;

  enableParts: (projectId: string, storyId: string) => Promise<void>;
  createPart: (projectId: string, storyId: string, order: number) => Promise<string>;
  deletePart: (projectId: string, storyId: string, partId: string) => Promise<void>;
  reorderParts: (projectId: string, storyId: string, partIds: string[]) => Promise<void>;

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
  currentPartId: null,

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

      // Set current part to first part if available and not already set
      if (metadata.parts.length > 0 && !get().currentPartId) {
        set({ currentPartId: metadata.parts[0].id });
      }
    } else {
      console.error('[useAppStore] loadStoryMetadata failed:', response.error);
      throw new Error(response.error);
    }
  },

  setCurrentPartId(partId) {
    set({ currentPartId: partId });
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

      return newPart.id;
    } else {
      console.error('[useAppStore] createPart failed:', response.error);
      throw new Error(response.error);
    }
  },

  async deletePart(projectId, storyId, partId) {
    const response = await client.deletePart(projectId, storyId, partId);
    if (response.ok) {
      // If deleting current part, switch to first available part
      if (get().currentPartId === partId) {
        const metadata = get().currentStoryMetadata;
        if (metadata && metadata.parts.length > 1) {
          const otherPart = metadata.parts.find((p) => p.id !== partId);
          if (otherPart) {
            set({ currentPartId: otherPart.id });
          }
        } else {
          set({ currentPartId: null });
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

  // ---------------------------------------------------------------------------
  // Wizard actions (delegated out of the store; store only owns wizard state)
  // ---------------------------------------------------------------------------
  ...createWizardActions({
    set,
    get,
    sendChat: (args) => window.chat.send(args),
  }),
}));