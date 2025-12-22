// src/state/useAppStore.ts
import { create } from 'zustand';
import { client } from '../api/client';
import { metaJsonToMarkdown } from '../helpers/markdownUtils';
import type { MetaScope, MetaDocKey, MetaDocState } from '../types/metaDoc';

import type {
  WizardState,
  WizardActions,
  WizardContext,
  LlmProcessingStep,
} from '../wizards/types';
import { createWizardActions } from '../wizards/storeGlue';

import type { WritingLanguage } from '../types/language';
import {
  DEFAULT_WRITING_LANGUAGE,
  SUPPORTED_WRITING_LANGUAGES,
} from '../types/language';

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

  setHasApiKey: (v: boolean) => void;

  getMetaDoc: (scope: MetaScope, key: MetaDocKey) => MetaDocState | undefined;

  ensureMetaDocsLoaded: (scope: MetaScope, keys: MetaDocKey[]) => Promise<void>;

  updateMetaDoc: (scope: MetaScope, key: MetaDocKey, json: any) => void;

  saveMetaDoc: (scope: MetaScope, key: MetaDocKey) => Promise<void>;
} & WizardState &
  WizardActions;

// helper to get a unique id
export const metaId = (scope: MetaScope, key: MetaDocKey) => {
  if (scope.scope === 'root') return `root::${key}`;
  if (scope.scope === 'project') return `project:${scope.projectId}::${key}`;
  return `story:${scope.projectId}:${scope.storyId}::${key}`;
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
  // Wizard actions (delegated out of the store; store only owns wizard state)
  // ---------------------------------------------------------------------------
  ...createWizardActions({
    set,
    get,
    sendChat: (args) => window.chat.send(args),
  }),
}));