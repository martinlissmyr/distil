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

export const alineaClient = {
  // -------- Projects --------
  listProjects(): Promise<Project[]> {
    return window.alinea.listProjects();
  },
  createProject(name: string): Promise<Project> {
    return window.alinea.createProject(name);
  },
  updateProject(
    projectId: string,
    updates: { name?: string }
  ): Promise<Project> {
    return window.alinea.updateProject(projectId, updates);
  },
  deleteProject(projectId: string): Promise<{ ok: boolean }> {
    return window.alinea.deleteProject(projectId);
  },
  reorderProjects(ids: string[]): Promise<{ ok: boolean }> {
    return window.alinea.reorderProjects(ids);
  },

  // -------- Stories --------
  listStories(projectId: string): Promise<StoryMeta[]> {
    return window.alinea.listStories(projectId);
  },
  createStory(projectId: string, title: string): Promise<StoryMeta> {
    return window.alinea.createStory(projectId, title);
  },
  updateStory(
    projectId: string,
    storyId: string,
    updates: {
      title?: string;
      outlineDoc?: JSONContent;
      briefDoc?: JSONContent;
    }
  ): Promise<StoryMeta> {
    return window.alinea.updateStory(projectId, storyId, updates);
  },
  loadStory(projectId: string, storyId: string): Promise<StoryData> {
    return window.alinea.loadStory(projectId, storyId);
  },
  saveStory(
    projectId: string,
    storyId: string,
    payload: {
      id: string;
      title: string;
      doc: JSONContent;
      outlineDoc?: JSONContent;
      briefDoc?: JSONContent;
    }
  ): Promise<{ ok: boolean }> {
    return window.alinea.saveStory(projectId, storyId, payload);
  },
  reorderStories(
    projectId: string,
    ids: string[]
  ): Promise<{ ok: boolean }> {
    return window.alinea.reorderStories(projectId, ids);
  },

  // -------- Manifest --------
  loadManifest(): Promise<ManifestData> {
    // 👈 THIS must go through window.alinea, not alineaFs
    return window.alinea.loadManifest();
  },
  saveManifest(payload: ManifestData): Promise<{ ok: boolean }> {
    return window.alinea.saveManifest(payload);
  },
};