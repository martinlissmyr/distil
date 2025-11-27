import { ipcRenderer, contextBridge } from 'electron'

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
});

contextBridge.exposeInMainWorld('theme', {
  get: () => ipcRenderer.invoke('theme:get'),
  onChange: (callback) => {
    ipcRenderer.on('theme:changed', (_event, theme) => {
      callback(theme);
    });
  }
});

contextBridge.exposeInMainWorld('alinea', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (name) => ipcRenderer.invoke('projects:create', name),
  updateProject: (id, updates) => ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  reorderProjects: (ids) => ipcRenderer.invoke('projects:reorder', ids),

  listStories: (projectId) => ipcRenderer.invoke('stories:list', projectId),
  createStory: (projectId, title) => ipcRenderer.invoke('story:create', projectId, title),
  loadStory: (projectId, storyId) => ipcRenderer.invoke('story:load', projectId, storyId),
  saveStory: (projectId, storyId, payload) =>
    ipcRenderer.invoke('story:save', projectId, storyId, payload),
  reorderStories: (projectId, ids) =>
    ipcRenderer.invoke('stories:reorder', projectId, ids),
  updateStory: (projectId, storyId, updates) =>
    ipcRenderer.invoke('story:update', projectId, storyId, updates),

  deleteStory: (projectId, storyId) =>
    ipcRenderer.invoke('story:delete', projectId, storyId),
  loadManifest: () => ipcRenderer.invoke('alinea:loadManifest'),
  saveManifest: (payload: ManifestData) =>
    ipcRenderer.invoke('alinea:saveManifest', payload),
});

contextBridge.exposeInMainWorld('chat', {
  send: async (payload: { messages: { role: string; content: string }[] }) => {
    return ipcRenderer.invoke('chat:send', payload);
  },
});

contextBridge.exposeInMainWorld('settings', {
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', key),
  clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),
});
