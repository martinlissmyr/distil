// src/api/alineaClient.ts
import type { JSONContent } from '@tiptap/react';

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  order: number;
};

export type StoryMeta = {
  id: string;
  title: string;
  createdAt: string;
  order: number;
};

export type StoryData = {
  id: string;
  title: string;
  createdAt?: string;
  doc: JSONContent;
  outlineDoc?: JSONContent;
  briefDoc?: JSONContent;
};

// ---- Manifest types ----
export type ManifestData = {
  doc: JSONContent;
};

/**
 * Unwraps an IPC response, returning the data on success or throwing on error.
 * This maintains backward compatibility by converting the new standardized response
 * format into the simpler return-or-throw pattern.
 */
function unwrap<T>(response: { ok: true; data: T } | { ok: false; error: string }): T {
  if (response.ok) {
    return response.data;
  }
  throw new Error(response.error);
}

export const alineaClient = {
  // -------- Projects --------
  async listProjects(): Promise<Project[]> {
    return unwrap(await window.alinea.listProjects());
  },
  async createProject(name: string): Promise<Project> {
    return unwrap(await window.alinea.createProject(name));
  },
  async updateProject(
    projectId: string,
    updates: { name?: string }
  ): Promise<Project> {
    return unwrap(await window.alinea.updateProject(projectId, updates));
  },
  async deleteProject(projectId: string): Promise<void> {
    unwrap(await window.alinea.deleteProject(projectId));
  },
  async reorderProjects(ids: string[]): Promise<void> {
    unwrap(await window.alinea.reorderProjects(ids));
  },

  // -------- Stories --------
  async listStories(projectId: string): Promise<StoryMeta[]> {
    return unwrap(await window.alinea.listStories(projectId));
  },
  async createStory(projectId: string, title: string): Promise<StoryMeta> {
    return unwrap(await window.alinea.createStory(projectId, title));
  },
  async updateStory(
    projectId: string,
    storyId: string,
    updates: {
      title?: string;
      outlineDoc?: JSONContent;
      briefDoc?: JSONContent;
    }
  ): Promise<StoryMeta> {
    return unwrap(await window.alinea.updateStory(projectId, storyId, updates));
  },

  async loadStory(projectId: string, storyId: string): Promise<StoryData> {
    return unwrap(await window.alinea.loadStory(projectId, storyId));
  },

  async saveStory(
    projectId: string,
    storyId: string,
    payload: StoryData
  ): Promise<void> {
    unwrap(await window.alinea.saveStory(projectId, storyId, payload));
  },

  async reorderStories(projectId: string, ids: string[]): Promise<void> {
    unwrap(await window.alinea.reorderStories(projectId, ids));
  },

  // -------- Story metaDocs (flexible) --------
  async loadStoryMetaDoc(projectId: string, storyId: string, key: string): Promise<JSONContent | null> {
    return unwrap(await window.alinea.loadStoryMetaDoc(projectId, storyId, key));
  },

  async saveStoryMetaDoc(projectId: string, storyId: string, key: string, doc: JSONContent): Promise<void> {
    unwrap(await window.alinea.saveStoryMetaDoc(projectId, storyId, key, doc));
  },

  // -------- Root metaDocs (manifest, etc.) --------
  async loadRootMetaDoc(key: string): Promise<JSONContent | null> {
    return unwrap(await window.alinea.loadRootMetaDoc(key));
  },

  async saveRootMetaDoc(key: string, doc: JSONContent): Promise<void> {
    unwrap(await window.alinea.saveRootMetaDoc(key, doc));
  },

  // -------- Manifest (optional legacy) --------
  async loadManifest(): Promise<ManifestData> {
    return unwrap(await window.alinea.loadManifest());
  },
  async saveManifest(payload: ManifestData): Promise<void> {
    unwrap(await window.alinea.saveManifest(payload));
  },
};