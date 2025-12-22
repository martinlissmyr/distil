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
  loadStory: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('story:load', projectId, storyId),
  saveStory: (projectId: string, storyId: string, payload: any) =>
    ipcRenderer.invoke('story:save', projectId, storyId, payload),
  reorderStories: (projectId: string, ids: string[]) =>
    ipcRenderer.invoke('stories:reorder', projectId, ids),
  updateStory: (projectId: string, storyId: string, updates: any) =>
    ipcRenderer.invoke('story:update', projectId, storyId, updates),
  deleteStory: (projectId: string, storyId: string) =>
    ipcRenderer.invoke('story:delete', projectId, storyId),

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
})


contextBridge.exposeInMainWorld('devMode', {
  isDevMode: () => ipcRenderer.invoke('devMode:isDevMode'),
  openDevTools: () => ipcRenderer.invoke('devMode:openDevTools'),
})