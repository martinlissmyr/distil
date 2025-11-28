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

// ---- IPC Response types ----
export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Thin wrapper around window.alinea that passes through IpcResponse.
 * Consumers should check response.ok and handle errors explicitly.
 */
export const alineaClient = {
  // -------- Projects --------
  listProjects() {
    return window.alinea.listProjects();
  },
  createProject(name: string) {
    return window.alinea.createProject(name);
  },
  updateProject(projectId: string, updates: { name?: string }) {
    return window.alinea.updateProject(projectId, updates);
  },
  deleteProject(projectId: string) {
    return window.alinea.deleteProject(projectId);
  },
  reorderProjects(ids: string[]) {
    return window.alinea.reorderProjects(ids);
  },

  // -------- Stories --------
  listStories(projectId: string) {
    return window.alinea.listStories(projectId);
  },
  createStory(projectId: string, title: string) {
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
  ) {
    return window.alinea.updateStory(projectId, storyId, updates);
  },
  loadStory(projectId: string, storyId: string) {
    return window.alinea.loadStory(projectId, storyId);
  },
  saveStory(projectId: string, storyId: string, payload: StoryData) {
    return window.alinea.saveStory(projectId, storyId, payload);
  },
  reorderStories(projectId: string, ids: string[]) {
    return window.alinea.reorderStories(projectId, ids);
  },

  // -------- Story metaDocs (flexible) --------
  loadStoryMetaDoc(projectId: string, storyId: string, key: string) {
    return window.alinea.loadStoryMetaDoc(projectId, storyId, key);
  },
  saveStoryMetaDoc(projectId: string, storyId: string, key: string, doc: JSONContent) {
    return window.alinea.saveStoryMetaDoc(projectId, storyId, key, doc);
  },

  // -------- Root metaDocs (manifest, etc.) --------
  loadRootMetaDoc(key: string) {
    return window.alinea.loadRootMetaDoc(key);
  },
  saveRootMetaDoc(key: string, doc: JSONContent) {
    return window.alinea.saveRootMetaDoc(key, doc);
  },

  // -------- Manifest (optional legacy) --------
  loadManifest() {
    return window.alinea.loadManifest();
  },
  saveManifest(payload: ManifestData) {
    return window.alinea.saveManifest(payload);
  },
};