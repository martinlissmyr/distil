export {};

declare global {
  interface Window {
    alinea: {
      // Projects
      listProjects: () => Promise<{ id: string; name: string; createdAt: string; order: number }[]>;
      createProject: (name: string) => Promise<{ id: string; name: string; createdAt: string; order: number }>;
      updateProject: (
        projectId: string,
        updates: { name?: string }
      ) => Promise<{ id: string; name: string; createdAt: string; order: number }>;
      deleteProject: (projectId: string) => Promise<{ ok: boolean }>;
      reorderProjects: (ids: string[]) => Promise<{ ok: boolean }>;

      // Stories
      listStories: (
        projectId: string
      ) => Promise<{ id: string; title: string; createdAt: string; order: number }[]>;
      createStory: (
        projectId: string,
        title: string
      ) => Promise<{ id: string; title: string; createdAt: string; order: number }>;
      loadStory: (
        projectId: string,
        storyId: string
      ) => Promise<{ id: string; title: string; createdAt?: string; doc: any }>;
      saveStory: (
        projectId: string,
        storyId: string,
        payload: { id: string; title: string; doc: unknown }
      ) => Promise<{ ok: boolean }>;
      reorderStories: (
        projectId: string,
        ids: string[]
      ) => Promise<{ ok: boolean }>;
      updateStory: (
        projectId: string,
        storyId: string,
        updates: { title?: string }
      ) => Promise<{ id: string; title: string; createdAt: string; order: number }>;
      deleteStory: (
        projectId: string,
        storyId: string
      ) => Promise<{ ok: boolean }>;

      // MetaDocs
      loadStoryMetaDoc: (projectId: string, storyId: string, key: string) => Promise<any | null>;
      saveStoryMetaDoc: (
        projectId: string,
        storyId: string,
        key: string,
        doc: any
      ) => Promise<{ ok: boolean }>;
      loadRootMetaDoc: (key: string) => Promise<any | null>;
      saveRootMetaDoc: (key: string, doc: any) => Promise<{ ok: boolean }>;

      // Manifest (legacy)
      loadManifest: () => Promise<{ doc: any; updatedAt?: string }>;
      saveManifest: (payload: { doc: any }) => Promise<{ ok: boolean }>;
    };

    chat: {
      send: (
        payload: { messages: { role: 'user' | 'assistant' | 'system'; content: string }[] }
      ) => Promise<{
        ok: boolean;
        output_text?: string;
        error?: string;
        raw?: unknown;
      }>;
    };

    settings: {
      getApiKey: () => Promise<string | null>;
      setApiKey: (key: string) => Promise<void>;
      clearApiKey: () => Promise<{ ok: boolean }>;
    };

    theme: {
      get: () => Promise<'dark' | 'light'>;
      onChange: (callback: (theme: 'dark' | 'light') => void) => void;
    };
  }
}