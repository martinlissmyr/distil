// electron/preload.ts
import { ipcRenderer, contextBridge } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { JSONContent } from '@tiptap/react'
import type { WritingLanguage } from '../src/types/language'
import type { UiSchema } from '../src/types/ui'
import type { ChatModelProfileId } from '../src/types/ai'
import type { EntityType, EntityIndex } from '../src/models/entities/entityIndex'
import type { CharacterDoc } from '../src/models/entities/schemas/character'
import type { LocationDoc } from '../src/models/entities/schemas/location'
import type { StoryMetadata, PartDoc } from '../src/models/story'
import type { MergedStory } from '../src/models/export'
import type { ChatThread, ProjectMeta, StoryMeta } from './fs/fs'

type EntityDoc = CharacterDoc | LocationDoc
type ProjectUpdate = { name?: string }
type StoryUpdate = { title?: string }
type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }
type ChatPayload = {
  messages: ChatMessage[];
  profile?: ChatModelProfileId;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

contextBridge.exposeInMainWorld('theme', {
  get: () => ipcRenderer.invoke('theme:get'),
  onChange: (callback: (theme: UiSchema) => void) => {
    ipcRenderer.on('theme:changed', (_event, theme: UiSchema) => {
      callback(theme)
    })
  },
})

contextBridge.exposeInMainWorld('distil', {
  // -------- projects ----------
  listProjects: () => ipcRenderer.invoke('projects:list') as Promise<ProjectMeta[]>,
  createProject: (name: string) => ipcRenderer.invoke('projects:create', name),
  updateProject: (id: string, updates: ProjectUpdate) =>
    ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id),
  reorderProjects: (ids: string[]) =>
    ipcRenderer.invoke('projects:reorder', ids),

  // -------- stories ----------
  listStories: (projectId: string) =>
    ipcRenderer.invoke('stories:list', projectId) as Promise<StoryMeta[]>,
  createStory: (projectId: string, title: string) =>
    ipcRenderer.invoke('story:create', projectId, title),
  loadStoryMetadata: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('story:loadMetadata', projectId, storyId),
  saveStoryMetadata: (projectId: string, storyId: string, metadata: StoryMetadata) =>
    ipcRenderer.invoke('story:saveMetadata', projectId, storyId, metadata),
  updateStory: (projectId: string, storyId: string, updates: StoryUpdate) =>
    ipcRenderer.invoke('story:update', projectId, storyId, updates),
  deleteStory: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('story:delete', projectId, storyId),
  reorderStories: (projectId: string, ids: string[]) =>
    ipcRenderer.invoke('stories:reorder', projectId, ids),

  // -------- parts (multi-part documents) ----------
  loadPartDoc: (projectId: string, storyId: string, partId: string) =>
    ipcRenderer.invoke('part:load', projectId, storyId, partId) as Promise<PartDoc>,
  savePartDoc: (projectId: string, storyId: string, partId: string, doc: JSONContent) =>
    ipcRenderer.invoke('part:save', projectId, storyId, partId, doc),
  createPart: (projectId: string, storyId: string, order: number) =>
    ipcRenderer.invoke('part:create', projectId, storyId, order),
  deletePart: (projectId: string, storyId: string, partId: string) =>
    ipcRenderer.invoke('part:delete', projectId, storyId, partId),
  reorderParts: (projectId: string, storyId: string, ids: string[]) =>
    ipcRenderer.invoke('parts:reorder', projectId, storyId, ids),

  // -------- metaDocs (flexible keys) ----------
  loadStoryMetaDoc: (projectId: string, storyId: string, key: string) =>
    ipcRenderer.invoke('storyMeta:load', projectId, storyId, key),
  saveStoryMetaDoc: (
    projectId: string,
    storyId: string,
    key: string,
    doc: JSONContent
  ) => ipcRenderer.invoke('storyMeta:save', projectId, storyId, key, doc),

  // -------- root metaDocs (e.g. manifest) ----------
  loadRootMetaDoc: (key: string) =>
    ipcRenderer.invoke('rootMeta:load', key),
  saveRootMetaDoc: (key: string, doc: JSONContent) =>
    ipcRenderer.invoke('rootMeta:save', key, doc),

  // -------- entity indices ----------
  loadEntityIndex: (projectId: string, storyId: string, entityType: EntityType) =>
    ipcRenderer.invoke('entity:loadIndex', projectId, storyId, entityType),
  saveEntityIndex: (projectId: string, storyId: string, entityType: EntityType, index: EntityIndex) =>
    ipcRenderer.invoke('entity:saveIndex', projectId, storyId, entityType, index),

  // -------- entity documents ----------
  loadEntityDoc: (projectId: string, storyId: string, entityType: EntityType, entityId: string) =>
    ipcRenderer.invoke('entity:load', projectId, storyId, entityType, entityId),
  saveEntityDoc: (projectId: string, storyId: string, entityType: EntityType, entityId: string, doc: EntityDoc) =>
    ipcRenderer.invoke('entity:save', projectId, storyId, entityType, entityId, doc),

  // -------- chat threads ----------
  loadChatThread: (threadId: string) => ipcRenderer.invoke('chat:load', threadId),
  saveChatThread: (thread: ChatThread) => ipcRenderer.invoke('chat:save', thread),

  // -------- export ----------
  exportToDocx: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('export:exportToDocx', projectId, storyId),
  exportToPdf: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('export:exportToPdf', projectId, storyId),
  getMergedStory: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('export:getMergedStory', projectId, storyId) as Promise<MergedStory>,
  showSaveDialog: (storyTitle: string, format: 'docx' | 'pdf') =>
    ipcRenderer.invoke('export:showSaveDialog', storyTitle, format),
  saveFile: (filePath: string, buffer: Uint8Array) =>
    ipcRenderer.invoke('export:saveFile', filePath, Buffer.from(buffer)),
})

contextBridge.exposeInMainWorld('chat', {
  send: async (payload: ChatPayload) => {
    return ipcRenderer.invoke('chat:send', payload)
  },
  stream: (
    payload: ChatPayload,
    handlers: {
      onDelta: (delta: string) => void;
      onDone: (result: { output_text: string }) => void;
      onError: (error: string) => void;
    }
  ) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const cleanup = () => {
      ipcRenderer.removeListener('chat:stream:delta', handleDelta);
      ipcRenderer.removeListener('chat:stream:done', handleDone);
      ipcRenderer.removeListener('chat:stream:error', handleError);
    };

    const handleDelta = (_event: IpcRendererEvent, event: { requestId: string; delta: string }) => {
      if (event.requestId !== requestId) return;
      handlers.onDelta(event.delta);
    };

    const handleDone = (_event: IpcRendererEvent, event: { requestId: string; output_text: string }) => {
      if (event.requestId !== requestId) return;
      cleanup();
      handlers.onDone({ output_text: event.output_text });
    };

    const handleError = (_event: IpcRendererEvent, event: { requestId: string; error: string }) => {
      if (event.requestId !== requestId) return;
      cleanup();
      handlers.onError(event.error);
    };

    ipcRenderer.on('chat:stream:delta', handleDelta);
    ipcRenderer.on('chat:stream:done', handleDone);
    ipcRenderer.on('chat:stream:error', handleError);
    ipcRenderer.send('chat:stream:start', { requestId, payload });

    return {
      cancel: () => {
        cleanup();
        ipcRenderer.send('chat:stream:cancel', requestId);
      },
    };
  },
})

contextBridge.exposeInMainWorld('settings', {
  // ---- API key ----
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', key),
  clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),

  // ---- writing language ----
  getWritingLanguage: () => ipcRenderer.invoke('settings:getWritingLanguage'),
  setWritingLanguage: (lang: WritingLanguage) =>
    ipcRenderer.invoke('settings:setWritingLanguage', lang),

  // ---- UI Schema ----
  getUiSchema: () => ipcRenderer.invoke('settings:getUiSchema'),
  setUiSchema: (schema: string) =>
    ipcRenderer.invoke('settings:setUiSchema', schema),
})


contextBridge.exposeInMainWorld('devMode', {
  isDevMode: () => ipcRenderer.invoke('devMode:isDevMode'),
})

contextBridge.exposeInMainWorld('menu', {
  updateContext: (context: { isStoryContext: boolean; projectId?: string; storyId?: string }) =>
    ipcRenderer.send('menu:updateContext', context),
  onExport: (callback: (format: 'docx' | 'pdf') => void) => {
    const handler = (_event: IpcRendererEvent, format: 'docx' | 'pdf') => callback(format);
    ipcRenderer.on('menu:export', handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('menu:export', handler);
    };
  },
  onNavigateToProject: (callback: (projectId: string) => void) => {
    const handler = (_event: IpcRendererEvent, projectId: string) => callback(projectId);
    ipcRenderer.on('navigation:openProject', handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('navigation:openProject', handler);
    };
  },
})
