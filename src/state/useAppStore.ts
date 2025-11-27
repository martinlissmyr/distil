// src/state/useAppStore.ts
import { create } from 'zustand';
import { alineaClient } from '../api/alineaClient';
import { jsonToMarkdown } from './markdownUtils';
import type { MetaScope, MetaDocKey, MetaDocState } from '../types/metaDoc';

type ApiState = { hasApiKey: boolean | null };

type AppStore = {
  api: ApiState;
  metaDocs: Record<string, MetaDocState>; // id -> state

  setHasApiKey: (v: boolean) => void;

  getMetaDoc: (scope: MetaScope, key: MetaDocKey) => MetaDocState | undefined;

  ensureMetaDocsLoaded: (
    scope: MetaScope,
    keys: MetaDocKey[]
  ) => Promise<void>;

  updateMetaDoc: (
    scope: MetaScope,
    key: MetaDocKey,
    json: any
  ) => void;

  saveMetaDoc: (scope: MetaScope, key: MetaDocKey) => Promise<void>;
};

// helper to get a unique id
export const metaId = (scope: MetaScope, key: MetaDocKey) => {
  if (scope.kind === 'root') return `root::${key}`;
  if (scope.kind === 'project') return `project:${scope.projectId}::${key}`;
  return `story:${scope.projectId}:${scope.storyId}::${key}`;
};

export const useAppStore = create<AppStore>((set, get) => ({
  api: { hasApiKey: null },

  metaDocs: {},

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

        if (scope.kind === 'root') {
          // Currently only "manifest" is supported as a root metaDoc
          if (key === 'manifest') {
            const data = await alineaClient.loadManifest();
            json = data?.doc ?? null;
          } else {
            console.warn(
              '[useAppStore] Root metaDoc key not supported yet:',
              key
            );
            json = null;
          }
        } else if (scope.kind === 'project') {
          // Project-level metaDocs not implemented yet — no-op for now
          console.warn(
            '[useAppStore] Project metaDocs not implemented yet:',
            scope.projectId,
            key
          );
          json = null;
        } else {
          // story-level metaDocs (brief, outline, etc)
          json = await alineaClient.loadStoryMetaDoc(
            scope.projectId,
            scope.storyId,
            key
          );
        }

        const markdown = json ? jsonToMarkdown(json) : '';

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
      } catch (err: any) {
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
              error: err?.message ?? 'Failed to load meta doc',
            },
          },
        }));
      }
    });

    await Promise.all(promises);
  },

  updateMetaDoc(scope, key, json) {
    const id = metaId(scope, key);
    const markdown = jsonToMarkdown(json);
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

    if (scope.kind === 'root') {
      if (key === 'manifest') {
        await alineaClient.saveManifest({ doc: docState.json });
      } else {
        console.warn(
          '[useAppStore] saveMetaDoc: root key not supported yet:',
          key
        );
      }
    } else if (scope.kind === 'project') {
      // placeholder for future project-level metaDocs
      console.warn(
        '[useAppStore] saveMetaDoc: project metaDocs not implemented yet:',
        scope.projectId,
        key
      );
    } else {
      await alineaClient.saveStoryMetaDoc(
        scope.projectId,
        scope.storyId,
        key,
        docState.json
      );
    }
  },
}));