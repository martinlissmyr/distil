// preload.ts
import { ipcRenderer, contextBridge } from 'electron'
import type { ManifestData } from '../src/api/alineaClient' // adjust path if needed

// If you still want a raw ipcRenderer API, you *can* keep this:
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

contextBridge.exposeInMainWorld('theme', {
  get: () => ipcRenderer.invoke('theme:get'),
  onChange: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme:changed', (_event, theme) => {
      callback(theme)
    })
  },
})

contextBridge.exposeInMainWorld('alinea', {
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

  // -------- manifest (legacy direct API, still okay to keep) ----------
  loadManifest: () => ipcRenderer.invoke('alinea:loadManifest'),
  saveManifest: (payload: ManifestData) =>
    ipcRenderer.invoke('alinea:saveManifest', payload),
})

contextBridge.exposeInMainWorld('chat', {
  send: async (payload: { messages: { role: string; content: string }[] }) => {
    return ipcRenderer.invoke('chat:send', payload)
  },
})

contextBridge.exposeInMainWorld('settings', {
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', key),
  clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),
})