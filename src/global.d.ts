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

/**
 * Chat thread persistence type
 */
type ChatThread = {
  threadId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actualPrompt?: string;
  }>;
  createdAt: string;
  lastUpdated: string;
};

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

      // Stories (multi-part structure)
      listStories: (projectId: string) => Promise<
        IpcResponse<{ id: string; title: string; createdAt: string; order: number }[]>
      >;
      createStory: (projectId: string, title: string) => Promise<
        IpcResponse<{ id: string; title: string; createdAt: string; order: number }>
      >;
      loadStoryMetadata: (projectId: string, storyId: string) => Promise<
        IpcResponse<{
          id: string;
          title: string;
          order: number;
          partsEnabled: boolean;
          parts: Array<{
            id: string;
            order: number;
            projection?: { summary: string; generatedAt: string };
            comment?: string;
            wordCount?: number;
            createdAt: string;
            updatedAt: string;
          }>;
          createdAt: string;
          updatedAt: string;
        }>
      >;
      saveStoryMetadata: (
        projectId: string,
        storyId: string,
        metadata: {
          id: string;
          title: string;
          order: number;
          partsEnabled: boolean;
          parts: any[];
          createdAt: string;
          updatedAt: string;
        }
      ) => Promise<IpcResponse<undefined>>;
      updateStory: (
        projectId: string,
        storyId: string,
        updates: { title?: string }
      ) => Promise<IpcResponse<{ id: string; title: string; createdAt: string; order: number }>>;
      deleteStory: (projectId: string, storyId: string) => Promise<IpcResponse<undefined>>;
      reorderStories: (projectId: string, ids: string[]) => Promise<IpcResponse<undefined>>;

      // Parts (multi-part documents)
      loadPartDoc: (projectId: string, storyId: string, partId: string) => Promise<
        IpcResponse<{ id: string; doc: any; updatedAt: string }>
      >;
      savePartDoc: (
        projectId: string,
        storyId: string,
        partId: string,
        doc: any
      ) => Promise<IpcResponse<undefined>>;
      createPart: (projectId: string, storyId: string, order: number) => Promise<
        IpcResponse<{
          id: string;
          order: number;
          projection?: { summary: string; generatedAt: string };
          comment?: string;
          wordCount?: number;
          createdAt: string;
          updatedAt: string;
        }>
      >;
      deletePart: (projectId: string, storyId: string, partId: string) => Promise<IpcResponse<undefined>>;
      reorderParts: (projectId: string, storyId: string, ids: string[]) => Promise<IpcResponse<undefined>>;

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

      // Chat thread persistence
      loadChatThread: (threadId: string) => Promise<IpcResponse<ChatThread | null>>;
      saveChatThread: (thread: ChatThread) => Promise<IpcResponse<undefined>>;

      // Export
      exportToDocx: (projectId: string, storyId: string) => Promise<
        IpcResponse<{ success: boolean; filePath?: string; cancelled?: boolean }>
      >;
      exportToPdf: (projectId: string, storyId: string) => Promise<
        IpcResponse<{ success: boolean; filePath?: string; cancelled?: boolean }>
      >;
      getMergedStory: (projectId: string, storyId: string) => Promise<
        IpcResponse<{
          title: string;
          parts: Array<{
            partId: string;
            partIndex: number;
            partTitle: string;
            content: any;
          }>;
          metadata: any;
        }>
      >;
      showSaveDialog: (storyTitle: string, format: 'docx' | 'pdf') => Promise<
        IpcResponse<string | null>
      >;
      saveFile: (filePath: string, buffer: Uint8Array) => Promise<IpcResponse<{ success: boolean }>>;
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
    };

    menu: {
      updateContext: (context: {
        isStoryContext: boolean;
        projectId?: string;
        storyId?: string;
      }) => void;
      onExport: (callback: (format: 'docx' | 'pdf') => void) => (() => void) | undefined;
      onNavigateToProject: (callback: (projectId: string) => void) => (() => void) | undefined;
    };
  }
}