// src/global.d.ts
export {};

import type { WritingLanguage } from './types/language';
import type { UiSchema } from './types/ui';
import type { EntityType } from './models/entityIndex';

/**
 * Standardized IPC response types
 */
type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

declare global {
  interface Window {
    distil: {
      // Projects
      listProjects: () => Promise<
        IpcResponse<{ id: string; name: string; createdAt: string; order: number }[]>
      >;
      createProject: (name: string) => Promise<
        IpcResponse<{ id: string; name: string; createdAt: string; order: number }>
      >;
      updateProject: (
        projectId: string,
        updates: { name?: string }
      ) => Promise<IpcResponse<{ id: string; name: string; createdAt: string; order: number }>>;
      deleteProject: (projectId: string) => Promise<IpcResponse<undefined>>;
      reorderProjects: (ids: string[]) => Promise<IpcResponse<undefined>>;

      // Stories
      listStories: (projectId: string) => Promise<
        IpcResponse<{ id: string; title: string; createdAt: string; order: number }[]>
      >;
      createStory: (projectId: string, title: string) => Promise<
        IpcResponse<{ id: string; title: string; createdAt: string; order: number }>
      >;
      loadStory: (projectId: string, storyId: string) => Promise<
        IpcResponse<{ id: string; title: string; createdAt?: string; doc: any }>
      >;
      saveStory: (
        projectId: string,
        storyId: string,
        payload: { id: string; title: string; doc: unknown }
      ) => Promise<IpcResponse<undefined>>;
      reorderStories: (projectId: string, ids: string[]) => Promise<IpcResponse<undefined>>;
      updateStory: (
        projectId: string,
        storyId: string,
        updates: { title?: string }
      ) => Promise<IpcResponse<{ id: string; title: string; createdAt: string; order: number }>>;
      deleteStory: (projectId: string, storyId: string) => Promise<IpcResponse<undefined>>;

      // MetaDocs
      loadStoryMetaDoc: (
        projectId: string,
        storyId: string,
        key: string
      ) => Promise<IpcResponse<any | null>>;
      saveStoryMetaDoc: (
        projectId: string,
        storyId: string,
        key: string,
        doc: any
      ) => Promise<IpcResponse<undefined>>;
      loadRootMetaDoc: (key: string) => Promise<IpcResponse<any | null>>;
      saveRootMetaDoc: (key: string, doc: any) => Promise<IpcResponse<undefined>>;

      // Entity Indices
      loadEntityIndex: (
        projectId: string,
        storyId: string,
        entityType: EntityType
      ) => Promise<IpcResponse<any | null>>;
      saveEntityIndex: (
        projectId: string,
        storyId: string,
        entityType: EntityType,
        index: any
      ) => Promise<IpcResponse<undefined>>;

      // Entity Documents
      loadEntityDoc: (
        projectId: string,
        storyId: string,
        entityType: 'character' | 'location',
        entityId: string
      ) => Promise<IpcResponse<any>>;
      saveEntityDoc: (
        projectId: string,
        storyId: string,
        entityType: 'character' | 'location',
        entityId: string,
        doc: any
      ) => Promise<IpcResponse<undefined>>;
    };

    chat: {
      send: (payload: {
        messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        responseFormat?: 'json' | 'text';
      }) => Promise<
        IpcResponse<{
          output_text: string;
          raw: unknown;
        }>
      >;
    };

    settings: {
      // API key
      getApiKey: () => Promise<IpcResponse<string | null>>;
      setApiKey: (key: string) => Promise<IpcResponse<undefined>>;
      clearApiKey: () => Promise<IpcResponse<undefined>>;

      // Writing language
      getWritingLanguage: () => Promise<IpcResponse<WritingLanguage>>;
      setWritingLanguage: (lang: WritingLanguage) => Promise<IpcResponse<undefined>>;

      // UI Schema
      getUiSchema: () => Promise<IpcResponse<string | null>>;
      setUiSchema: (schema: string) => Promise<IpcResponse<undefined>>;
    };

    theme: {
      get: () => Promise<IpcResponse<UiSchema>>;
      onChange: (callback: (theme: UiSchema) => void) => void;
    };

    devMode: {
      isDevMode: () => Promise<IpcResponse<boolean>>;
      openDevTools: () => Promise<IpcResponse<undefined>>;
    };
  }
}