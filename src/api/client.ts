// src/api/client.ts
import type { JSONContent } from '@tiptap/react';
import type { WritingLanguage } from '../types/language';
import type { UiSchemaSetting } from '../types/ui';
import type { EntityType, EntityIndex } from '../models/entities/entityIndex';
import type { CharacterDoc } from '../models/entities/schemas/character';
import type { LocationDoc } from '../models/entities/schemas/location';
import type { StoryMetadata } from '../models/story';
import type { MergedStory } from '../models/export';
import type { ChatThread } from '../../electron/fs/fs';

type EntityDoc = CharacterDoc | LocationDoc;

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

  // -------- Stories (multi-part structure) --------
  listStories(projectId: string) {
    return window.distil.listStories(projectId);
  },
  createStory(projectId: string, title: string) {
    return window.distil.createStory(projectId, title);
  },
  loadStoryMetadata(projectId: string, storyId: string) {
    return window.distil.loadStoryMetadata(projectId, storyId);
  },
  saveStoryMetadata(projectId: string, storyId: string, metadata: StoryMetadata) {
    return window.distil.saveStoryMetadata(projectId, storyId, metadata);
  },
  updateStory(projectId: string, storyId: string, updates: { title?: string }) {
    return window.distil.updateStory(projectId, storyId, updates);
  },
  deleteStory(projectId: string, storyId: string) {
    return window.distil.deleteStory(projectId, storyId);
  },
  reorderStories(projectId: string, ids: string[]) {
    return window.distil.reorderStories(projectId, ids);
  },

  // -------- Parts (multi-part documents) --------
  loadPartDoc(projectId: string, storyId: string, partId: string) {
    return window.distil.loadPartDoc(projectId, storyId, partId);
  },
  savePartDoc(projectId: string, storyId: string, partId: string, doc: JSONContent) {
    return window.distil.savePartDoc(projectId, storyId, partId, doc);
  },
  createPart(projectId: string, storyId: string, order: number) {
    return window.distil.createPart(projectId, storyId, order);
  },
  deletePart(projectId: string, storyId: string, partId: string) {
    return window.distil.deletePart(projectId, storyId, partId);
  },
  reorderParts(projectId: string, storyId: string, ids: string[]) {
    return window.distil.reorderParts(projectId, storyId, ids);
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

  // -------- Entity Indices --------
  loadEntityIndex(projectId: string, storyId: string, entityType: EntityType) {
    return window.distil.loadEntityIndex(projectId, storyId, entityType);
  },
  saveEntityIndex(projectId: string, storyId: string, entityType: EntityType, index: EntityIndex) {
    return window.distil.saveEntityIndex(projectId, storyId, entityType, index);
  },

  // -------- Entity Documents --------
  loadEntityDoc(projectId: string, storyId: string, entityType: EntityType, entityId: string) {
    return window.distil.loadEntityDoc(projectId, storyId, entityType, entityId);
  },
  saveEntityDoc(projectId: string, storyId: string, entityType: EntityType, entityId: string, doc: EntityDoc) {
    return window.distil.saveEntityDoc(projectId, storyId, entityType, entityId, doc);
  },

  // -------- Chat thread persistence --------
  loadChatThread(threadId: string) {
    return window.distil.loadChatThread(threadId);
  },
  saveChatThread(thread: ChatThread) {
    return window.distil.saveChatThread(thread);
  },

  // -------- Export --------
  exportToDocx(projectId: string, storyId: string) {
    return window.distil.exportToDocx(projectId, storyId);
  },
  exportToPdf(projectId: string, storyId: string) {
    return window.distil.exportToPdf(projectId, storyId);
  },
  getMergedStory(projectId: string, storyId: string) {
    return window.distil.getMergedStory(projectId, storyId) as Promise<IpcResponse<MergedStory>>;
  },
  showSaveDialog(storyTitle: string, format: 'docx' | 'pdf') {
    return window.distil.showSaveDialog(storyTitle, format);
  },
  saveFile(filePath: string, buffer: Uint8Array) {
    return window.distil.saveFile(filePath, buffer);
  },
};
