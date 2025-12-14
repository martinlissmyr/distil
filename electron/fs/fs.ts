// electron/fs/fs.ts
import path from 'path'
import fs from 'fs/promises'
import { app } from 'electron'
import type { JSONContent } from '@tiptap/react'
import { sanitizeId } from '../validation'
import { writeQueue } from './writeQueue'

export type ProjectMeta = {
  id: string
  name: string
  createdAt: string
  order: number
}

export type StoryMeta = {
  id: string
  title: string
  createdAt: string
  order: number
}

export type ManifestData = {
  doc: JSONContent
  updatedAt: string
}

// Flexible story file type
type StoryFile = {
  id: string
  title: string
  createdAt: string
  order: number
  doc: JSONContent
  // New flexible meta docs
  metaDocs?: Record<string, JSONContent>
  // Legacy fields – kept for backwards compatibility (optional)
  outlineDoc?: JSONContent
  briefDoc?: JSONContent
}

const getRootDir = () => {
  const home =
    process.env.HOME || process.env.USERPROFILE || app.getPath('home')
  return path.join(home, 'Distil')
}

const getManifestFile = () => path.join(getRootDir(), 'manifest.json')
const getProjectsDir = () => path.join(getRootDir(), 'projects')
const getProjectDir = (projectId: string) =>
  path.join(getProjectsDir(), sanitizeId(projectId))
const getProjectFile = (projectId: string) =>
  path.join(getProjectDir(projectId), 'project.json')
const getStoriesDir = (projectId: string) =>
  path.join(getProjectDir(projectId), 'stories')
const getStoryFile = (projectId: string, storyId: string) =>
  path.join(getStoriesDir(projectId), `${sanitizeId(storyId)}.json`)

// ---- Projects ----

export async function listProjects(): Promise<ProjectMeta[]> {
  const dir = getProjectsDir()
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const projects: ProjectMeta[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const pid = entry.name
      const file = getProjectFile(pid)

      try {
        const raw = await fs.readFile(file, 'utf-8')
        const data = JSON.parse(raw) as ProjectMeta
        projects.push(data)
      } catch (err: unknown) {
        // Skip broken/corrupted project files but log the issue
        console.warn(`[listProjects] Skipping broken project ${pid}:`,
          err instanceof Error ? err.message : 'Unknown error')
      }
    }

    projects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return projects
  } catch (err: unknown) {
    // Directory doesn't exist yet - expected on first run
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    // Unexpected error - log and throw
    console.error('[listProjects] Failed to read projects directory:', err)
    throw new Error('Failed to list projects')
  }
}

export async function createProject(name: string): Promise<ProjectMeta> {
  const dir = getProjectsDir()
  await fs.mkdir(dir, { recursive: true })

  const existing = await listProjects()
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((p) => p.order ?? 0)) : 0

  const id = `project-${Date.now()}`
  const pdir = getProjectDir(id)
  await fs.mkdir(pdir, { recursive: true })
  await fs.mkdir(getStoriesDir(id), { recursive: true })

  const project: ProjectMeta = {
    id,
    name,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1,
  }

  await fs.writeFile(getProjectFile(id), JSON.stringify(project, null, 2), 'utf-8')
  return project
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<ProjectMeta, 'name'>>
): Promise<ProjectMeta> {
  const file = getProjectFile(projectId)
  const raw = await fs.readFile(file, 'utf-8')
  const existing = JSON.parse(raw) as ProjectMeta
  const updated: ProjectMeta = { ...existing, ...updates }

  await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}

export async function deleteProject(projectId: string): Promise<void> {
  const dir = getProjectDir(projectId)
  await fs.rm(dir, { recursive: true, force: true })
}

export async function reorderProjects(idsInOrder: string[]): Promise<void> {
  const projects = await listProjects()
  const byId = new Map(projects.map((p) => [p.id, p]))

  let index = 0
  for (const id of idsInOrder) {
    const p = byId.get(id)
    if (!p) continue
    p.order = index++

    await fs.writeFile(getProjectFile(id), JSON.stringify(p, null, 2), 'utf-8')
  }
}

// ---- Stories ----

export async function listStories(projectId: string): Promise<StoryMeta[]> {
  const dir = getStoriesDir(projectId)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const stories: StoryMeta[] = []
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const fullPath = path.join(dir, entry.name)
      try {
        const raw = await fs.readFile(fullPath, 'utf-8')
        const json = JSON.parse(raw) as StoryFile
        stories.push({
          id: json.id,
          title: json.title,
          createdAt: json.createdAt ?? new Date().toISOString(),
          order: json.order ?? 0,
        })
      } catch (err: unknown) {
        // Skip broken/corrupted story files but log the issue
        console.warn(`[listStories] Skipping broken story ${entry.name}:`,
          err instanceof Error ? err.message : 'Unknown error')
      }
    }
    stories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return stories
  } catch (err: unknown) {
    // Stories directory doesn't exist yet - expected for new projects
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    // Unexpected error - log and throw
    console.error('[listStories] Failed to read stories directory:', err)
    throw new Error('Failed to list stories')
  }
}

export async function createStory(
  projectId: string,
  title: string
): Promise<StoryMeta> {
  const existing = await listStories(projectId)
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((s) => s.order ?? 0)) : 0

  const id = `story-${Date.now()}`
  const file = getStoryFile(projectId, id)
  await fs.mkdir(getStoriesDir(projectId), { recursive: true })

  const emptyDoc: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  }

  const story: StoryFile = {
    id,
    title,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1,
    doc: emptyDoc,
    metaDocs: {}, // start empty
  }

  await fs.writeFile(file, JSON.stringify(story, null, 2), 'utf-8')

  return {
    id,
    title,
    createdAt: story.createdAt,
    order: story.order,
  }
}

export async function loadStory(projectId: string, storyId: string): Promise<StoryFile> {
  const file = getStoryFile(projectId, storyId);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw) as StoryFile;
}

export async function saveStory(
  projectId: string,
  storyId: string,
  payload: StoryFile
): Promise<void> {
  // Use write queue to prevent race conditions when multiple autosaves
  // (prose, outline, brief) trigger simultaneously
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    const file = getStoryFile(projectId, storyId)
    const raw = await fs.readFile(file, 'utf-8').catch(() => null)
    const existing: StoryFile =
      raw != null
        ? (JSON.parse(raw) as StoryFile)
        : {
            id: storyId,
            title: payload.title,
            createdAt: new Date().toISOString(),
            order: 0,
            doc: payload.doc,
            metaDocs: {},
          }

    const story: StoryFile = {
      ...existing,
      ...payload,
      metaDocs: payload.metaDocs ?? existing.metaDocs ?? {},
    }

    await fs.mkdir(getStoriesDir(projectId), { recursive: true })
    await fs.writeFile(file, JSON.stringify(story, null, 2), 'utf-8')
  })
}

export async function updateStory(
  projectId: string,
  storyId: string,
  updates: Partial<Pick<StoryMeta, 'title'>>
): Promise<StoryMeta> {
  const file = getStoryFile(projectId, storyId)
  const raw = await fs.readFile(file, 'utf-8')
  const existing = JSON.parse(raw) as StoryFile

  const updated: StoryFile = {
    ...existing,
    ...updates,
  }

  await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8')

  return {
    id: updated.id,
    title: updated.title,
    createdAt: updated.createdAt ?? new Date().toISOString(),
    order: updated.order ?? 0,
  }
}

export async function deleteStory(
  projectId: string,
  storyId: string
): Promise<void> {
  const file = getStoryFile(projectId, storyId)
  await fs.rm(file, { force: true })
}

export async function reorderStories(
  projectId: string,
  idsInOrder: string[]
): Promise<void> {
  const stories = await listStories(projectId)
  const byId = new Map(stories.map((s) => [s.id, s]))

  let index = 0
  for (const id of idsInOrder) {
    const s = byId.get(id)
    if (!s) continue
    s.order = index++

    const file = getStoryFile(projectId, id)
    const raw = await fs.readFile(file, 'utf-8')
    const json = JSON.parse(raw) as StoryFile
    json.order = s.order
    await fs.writeFile(file, JSON.stringify(json, null, 2), 'utf-8')
  }
}

// ---- metaDocs helpers ----

export async function loadStoryMetaDoc(
  projectId: string,
  storyId: string,
  key: string
): Promise<JSONContent | null> {
  try {
    const story = await loadStory(projectId, storyId); // existing helper
    const meta = story.metaDocs ?? {};
    return meta[key] ?? null;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // Story file (or project dir) doesn't exist yet → no metaDoc
      return null;
    }
    throw err;
  }
}

export async function saveStoryMetaDoc(
  projectId: string,
  storyId: string,
  key: string,
  doc: JSONContent
): Promise<void> {
  // CRITICAL: Use same queue key as saveStory because they write to the same file
  // This prevents race conditions between prose saves and metaDoc saves
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    const file = getStoryFile(projectId, storyId)
    const raw = await fs.readFile(file, 'utf-8').catch(() => null)
    const existing: StoryFile =
      raw != null
        ? (JSON.parse(raw) as StoryFile)
        : {
            id: storyId,
            title: '',
            createdAt: new Date().toISOString(),
            order: 0,
            doc,
            metaDocs: {},
          }

    const metaDocs = { ...(existing.metaDocs ?? {}), [key]: doc }

    const updated: StoryFile = {
      ...existing,
      metaDocs,
    }

    await fs.mkdir(getStoriesDir(projectId), { recursive: true })
    await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8')
  })
}

// ---- Manifest ----

export async function loadManifest(): Promise<ManifestData> {
  const file = getManifestFile()

  try {
    const raw = await fs.readFile(file, 'utf-8')
    const json = JSON.parse(raw) as ManifestData

    return {
      doc: json.doc,
      updatedAt: json.updatedAt ?? new Date().toISOString(),
    }
  } catch (err: unknown) {
    // File doesn't exist yet - create empty manifest (expected on first run)
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('[loadManifest] Creating initial manifest file')
      const empty: ManifestData = {
        doc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }],
            },
          ],
        },
        updatedAt: new Date().toISOString(),
      }

      await fs.mkdir(getRootDir(), { recursive: true })
      await fs.writeFile(file, JSON.stringify(empty, null, 2), 'utf-8')
      return empty
    }
    // Unexpected error - log and throw
    console.error('[loadManifest] Failed to load manifest:', err)
    throw new Error('Failed to load manifest')
  }
}

export async function saveManifest(payload: {
  doc: JSONContent
}): Promise<void> {
  // Use write queue to serialize manifest saves
  const queueKey = 'manifest:root'

  return writeQueue.enqueue(queueKey, async () => {
    const file = getManifestFile()

    const manifest: ManifestData = {
      doc: payload.doc,
      updatedAt: new Date().toISOString(),
    }

    await fs.mkdir(getRootDir(), { recursive: true })
    await fs.writeFile(file, JSON.stringify(manifest, null, 2), 'utf-8')
  })
}

// ---- Root metaDocs (generic wrapper around Manifest) ----

export async function loadRootMetaDoc(key: string): Promise<JSONContent | null> {
  if (key === 'manifest') {
    const manifest = await loadManifest();
    return manifest.doc;
  }

  // If you later add more root-level meta docs, extend this switch.
  return null;
}

export async function saveRootMetaDoc(
  key: string,
  doc: JSONContent
): Promise<void> {
  if (key === 'manifest') {
    await saveManifest({ doc });
    return;
  }

  // For unknown keys, you could either no-op or throw.
  // For now, let's just no-op.
}