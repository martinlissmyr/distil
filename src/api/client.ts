// src/api/client.ts
import type { JSONContent } from '@tiptap/react';
import type { WritingLanguage } from '../types/language';
import type { UiSchemaSetting } from '../types/ui'; // ✅ add
import type { EntityType } from '../models/entities/entityIndex';

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
 * Thin wrapper around window.distil/window.settings that passes through IpcResponse.
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
    // NOTE: your global.d.ts types updateStory as { title?: string }
    // but you appear to pass outline/brief too. If your IPC handler supports it,
    // you should update global.d.ts accordingly. Leaving this as-is for runtime parity.
    return window.distil.updateStory(projectId, storyId, updates as any);
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

  // -------- Writing language --------
  getWritingLanguage() {
    return window.settings.getWritingLanguage();
  },
  setWritingLanguage(lang: WritingLanguage) {
    return window.settings.setWritingLanguage(lang);
  },

  // -------- UI Schema --------
  getUiSchema() {
    return window.settings.getUiSchema();
  },
  setUiSchema(schema: UiSchemaSetting) {
    return window.settings.setUiSchema(schema);
  },

  // -------- apiKey --------
  getApiKey() {
    return window.settings.getApiKey();
  },
  setApiKey(key: string) {
    return window.settings.setApiKey(key);
  },


  // -------- Dev Mode --------
  isDevMode() {
    return window.devMode.isDevMode();
  },
  openDevTools() {
    return window.devMode.openDevTools();
  },

  // -------- Entity Indices --------
  loadEntityIndex(projectId: string, storyId: string, entityType: EntityType) {
    return window.distil.loadEntityIndex(projectId, storyId, entityType);
  },
  saveEntityIndex(projectId: string, storyId: string, entityType: EntityType, index: any) {
    return window.distil.saveEntityIndex(projectId, storyId, entityType, index);
  },

  // -------- Entity Documents --------
  loadEntityDoc(projectId: string, storyId: string, entityType: EntityType, entityId: string) {
    return window.distil.loadEntityDoc(projectId, storyId, entityType, entityId);
  },
  saveEntityDoc(projectId: string, storyId: string, entityType: EntityType, entityId: string, doc: any) {
    return window.distil.saveEntityDoc(projectId, storyId, entityType, entityId, doc);
  },
};