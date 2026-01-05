// electron/preload.ts
import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('theme', {
  get: () => ipcRenderer.invoke('theme:get'),
  onChange: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme:changed', (_event, theme) => {
      callback(theme)
    })
  },
})

contextBridge.exposeInMainWorld('distil', {
  // -------- projects ----------
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (name: string) => ipcRenderer.invoke('projects:create', name),
  updateProject: (id: string, updates: any) =>
    ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id),
  reorderProjects: (ids: string[]) =>
    ipcRenderer.invoke('projects:reorder', ids),

  // -------- stories ----------
  listStories: (projectId: string) =>
    ipcRenderer.invoke('stories:list', projectId),
  createStory: (projectId: string, title: string) =>
    ipcRenderer.invoke('story:create', projectId, title),
  loadStoryMetadata: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('story:loadMetadata', projectId, storyId),
  saveStoryMetadata: (projectId: string, storyId: string, metadata: any) =>
    ipcRenderer.invoke('story:saveMetadata', projectId, storyId, metadata),
  updateStory: (projectId: string, storyId: string, updates: any) =>
    ipcRenderer.invoke('story:update', projectId, storyId, updates),
  deleteStory: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('story:delete', projectId, storyId),
  reorderStories: (projectId: string, ids: string[]) =>
    ipcRenderer.invoke('stories:reorder', projectId, ids),

  // -------- parts (multi-part documents) ----------
  loadPartDoc: (projectId: string, storyId: string, partId: string) =>
    ipcRenderer.invoke('part:load', projectId, storyId, partId),
  savePartDoc: (projectId: string, storyId: string, partId: string, doc: any) =>
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
    doc: any
  ) => ipcRenderer.invoke('storyMeta:save', projectId, storyId, key, doc),

  // -------- root metaDocs (e.g. manifest) ----------
  loadRootMetaDoc: (key: string) =>
    ipcRenderer.invoke('rootMeta:load', key),
  saveRootMetaDoc: (key: string, doc: any) =>
    ipcRenderer.invoke('rootMeta:save', key, doc),

  // -------- entity indices ----------
  loadEntityIndex: (projectId: string, storyId: string, entityType: 'character' | 'location') =>
    ipcRenderer.invoke('entity:loadIndex', projectId, storyId, entityType),
  saveEntityIndex: (projectId: string, storyId: string, entityType: 'character' | 'location', index: any) =>
    ipcRenderer.invoke('entity:saveIndex', projectId, storyId, entityType, index),

  // -------- entity documents ----------
  loadEntityDoc: (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string) =>
    ipcRenderer.invoke('entity:load', projectId, storyId, entityType, entityId),
  saveEntityDoc: (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string, doc: any) =>
    ipcRenderer.invoke('entity:save', projectId, storyId, entityType, entityId, doc),
})

contextBridge.exposeInMainWorld('chat', {
  send: async (payload: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json' | 'text';
  }) => {
    return ipcRenderer.invoke('chat:send', payload)
  },
})

contextBridge.exposeInMainWorld('settings', {
  // ---- API key ----
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', key),
  clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),

  // ---- writing language ----
  getWritingLanguage: () => ipcRenderer.invoke('settings:getWritingLanguage'),
  setWritingLanguage: (lang: string) =>
    ipcRenderer.invoke('settings:setWritingLanguage', lang),

  // ---- UI Schema ----
  getUiSchema: () => ipcRenderer.invoke('settings:getUiSchema'),
  setUiSchema: (schema: string) =>
    ipcRenderer.invoke('settings:setUiSchema', schema),
})


contextBridge.exposeInMainWorld('devMode', {
  isDevMode: () => ipcRenderer.invoke('devMode:isDevMode'),
  openDevTools: () => ipcRenderer.invoke('devMode:openDevTools'),
})