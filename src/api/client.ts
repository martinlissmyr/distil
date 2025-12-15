// src/api/client.ts
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
 * Thin wrapper around window.distil that passes through IpcResponse.
 * Consumers should check response.ok and handle errors explicitly.
 */
export const client = {
  // -------- Projects --------
  listProjects() {
    return window.distil.listProjects();
  },
  createProject(name: string) {
    return window.distil.createProject(name);
  },
  updateProject(projectId: string, updates: { name?: string }) {
    return window.distil.updateProject(projectId, updates);
  },
  deleteProject(projectId: string) {
    return window.distil.deleteProject(projectId);
  },
  reorderProjects(ids: string[]) {
    return window.distil.reorderProjects(ids);
  },

  // -------- Stories --------
  listStories(projectId: string) {
    return window.distil.listStories(projectId);
  },
  createStory(projectId: string, title: string) {
    return window.distil.createStory(projectId, title);
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
    return window.distil.updateStory(projectId, storyId, updates);
  },
  loadStory(projectId: string, storyId: string) {
    return window.distil.loadStory(projectId, storyId);
  },
  saveStory(projectId: string, storyId: string, payload: StoryData) {
    return window.distil.saveStory(projectId, storyId, payload);
  },
  reorderStories(projectId: string, ids: string[]) {
    return window.distil.reorderStories(projectId, ids);
  },

  // -------- Story metaDocs (flexible) --------
  loadStoryMetaDoc(projectId: string, storyId: string, key: string) {
    return window.distil.loadStoryMetaDoc(projectId, storyId, key);
  },
  saveStoryMetaDoc(projectId: string, storyId: string, key: string, doc: JSONContent) {
    return window.distil.saveStoryMetaDoc(projectId, storyId, key, doc);
  },

  // -------- Root metaDocs (manifest, etc.) --------
  loadRootMetaDoc(key: string) {
    return window.distil.loadRootMetaDoc(key);
  },
  saveRootMetaDoc(key: string, doc: JSONContent) {
    return window.distil.saveRootMetaDoc(key, doc);
  },

  // -------- Dev Mode --------
  isDevMode() {
    return window.devMode.isDevMode();
  },
  openDevTools() {
    return window.devMode.openDevTools();
  },

};