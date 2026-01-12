// electron/fs/fs.ts
import path from 'path'
import fs from 'fs/promises'
import { app } from 'electron'
import type { JSONContent } from '@tiptap/react'
import { sanitizeId } from '../validation'
import { writeQueue } from './writeQueue'
import { calculateWordCount } from '../utils/wordCount'

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

// Story metadata stored in story.json
export type StoryMetadata = {
  id: string
  title: string
  order: number
  partsEnabled: boolean
  parts: PartIndexEntry[]
  createdAt: string
  updatedAt: string
}

// Part index entry (lightweight projection stored in story.json)
export type PartIndexEntry = {
  id: string
  order: number
  projection?: {
    summary: string
    generatedAt: string
  }
  comment?: string
  wordCount?: number
  createdAt: string
  updatedAt: string
}

// Part document (full TipTap doc stored in parts/part-{id}.json)
export type PartDoc = {
  id: string
  doc: JSONContent
  updatedAt: string
}

const getRootDir = () => {
  const home =
    process.env.HOME || process.env.USERPROFILE || app.getPath('home')
  return path.join(home, 'Distil')
}

// ---- Safe/atomic JSON helpers ----

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const dir = path.dirname(file)
  await fs.mkdir(dir, { recursive: true })

  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
  const json = JSON.stringify(data, null, 2)

  // Write to temp, then rename into place (atomic on most FS)
  await fs.writeFile(tmp, json, 'utf-8')

  try {
    await fs.rename(tmp, file)
  } catch (e: any) {
    // Windows can fail if destination exists
    if (e?.code === 'EEXIST' || e?.code === 'EPERM') {
      await fs.rm(file, { force: true }).catch(() => {})
      await fs.rename(tmp, file)
    } else {
      // Clean up temp on unexpected errors
      await fs.rm(tmp, { force: true }).catch(() => {})
      throw e
    }
  }
}

function assertUpdatesObject(
  updates: unknown,
  label: string
): asserts updates is Record<string, unknown> {
  if (!isPlainObject(updates)) {
    throw new Error(`${label} must be an object (got ${typeof updates})`)
  }
}

const getManifestFile = () => path.join(getRootDir(), 'manifest.json')
const getProjectsDir = () => path.join(getRootDir(), 'projects')
const getProjectDir = (projectId: string) =>
  path.join(getProjectsDir(), sanitizeId(projectId))
const getProjectFile = (projectId: string) =>
  path.join(getProjectDir(projectId), 'project.json')
const getStoriesDir = (projectId: string) =>
  path.join(getProjectDir(projectId), 'stories')

// Story folder structure (multi-part documents)
const getStoryDir = (projectId: string, storyId: string) =>
  path.join(getStoriesDir(projectId), sanitizeId(storyId))
const getStoryMetadataFile = (projectId: string, storyId: string) =>
  path.join(getStoryDir(projectId, storyId), 'story.json')
const getPartsDir = (projectId: string, storyId: string) =>
  path.join(getStoryDir(projectId, storyId), 'parts')
const getPartFile = (projectId: string, storyId: string, partId: string) =>
  path.join(getPartsDir(projectId, storyId), `${sanitizeId(partId)}.json`)
const getStoryMetaDocFile = (projectId: string, storyId: string, key: string) =>
  path.join(getStoryDir(projectId, storyId), `${key}.json`)
const getEntitiesDir = (projectId: string, storyId: string) =>
  path.join(getStoryDir(projectId, storyId), 'entities')

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
        console.warn(
          `[listProjects] Skipping broken project ${pid}:`,
          err instanceof Error ? err.message : 'Unknown error'
        )
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

  // Serialize + atomic write
  await writeQueue.enqueue(`project:${id}`, async () => {
    await writeJsonAtomic(getProjectFile(id), project)
  })

  return project
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<ProjectMeta, 'name'>>
): Promise<ProjectMeta> {
  const queueKey = `project:${projectId}`

  return writeQueue.enqueue(queueKey, async () => {
    assertUpdatesObject(updates, 'updateProject(updates)')

    const file = getProjectFile(projectId)
    const raw = await fs.readFile(file, 'utf-8')
    const existing = JSON.parse(raw) as ProjectMeta

    const updated: ProjectMeta = { ...existing, ...(updates as any) }

    await writeJsonAtomic(file, updated)
    return updated
  })
}

export async function deleteProject(projectId: string): Promise<void> {
  const dir = getProjectDir(projectId)
  await fs.rm(dir, { recursive: true, force: true })
}

export async function reorderProjects(idsInOrder: string[]): Promise<void> {
  // Reorder is global across all projects -> single queue key
  const queueKey = `projects:reorder`

  return writeQueue.enqueue(queueKey, async () => {
    const projects = await listProjects()
    const byId = new Map(projects.map((p) => [p.id, p]))

    let index = 0
    for (const id of idsInOrder) {
      const p = byId.get(id)
      if (!p) continue
      p.order = index++

      await writeJsonAtomic(getProjectFile(id), p)
    }
  })
}

// ---- Stories ----

export async function listStories(projectId: string): Promise<StoryMeta[]> {
  const dir = getStoriesDir(projectId)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const stories: StoryMeta[] = []

    for (const entry of entries) {
      // Only look for story folders
      if (!entry.isDirectory()) continue

      const storyId = entry.name
      const metadataFile = getStoryMetadataFile(projectId, storyId)
      try {
        const raw = await fs.readFile(metadataFile, 'utf-8')
        const json = JSON.parse(raw) as StoryMetadata
        stories.push({
          id: json.id,
          title: json.title,
          createdAt: json.createdAt,
          order: json.order,
        })
      } catch (err: unknown) {
        // Skip broken/corrupted story metadata but log the issue
        console.warn(
          `[listStories] Skipping broken story folder ${storyId}:`,
          err instanceof Error ? err.message : 'Unknown error'
        )
      }
    }

    stories.sort((a, b) => a.order - b.order)
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
  const now = new Date().toISOString()

  // NEW: Create story folder structure
  const partsDir = getPartsDir(projectId, id)
  await fs.mkdir(partsDir, { recursive: true })

  // Create first part with empty document
  const partId = `part-${Date.now()}`
  const emptyDoc: JSONContent = {
    type: 'doc',
    content: [],
  }

  const firstPart: PartDoc = {
    id: partId,
    doc: emptyDoc,
    updatedAt: now,
  }

  // Create story metadata with parts index
  const metadata: StoryMetadata = {
    id,
    title,
    order: maxOrder + 1,
    partsEnabled: false, // Start with single-document mode
    parts: [
      {
        id: partId,
        order: 0,
        wordCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }

  // Serialize + atomic write
  await writeQueue.enqueue(`story:${projectId}:${id}`, async () => {
    await writeJsonAtomic(getStoryMetadataFile(projectId, id), metadata)
    await writeJsonAtomic(getPartFile(projectId, id, partId), firstPart)
  })

  return {
    id,
    title,
    createdAt: metadata.createdAt,
    order: metadata.order,
  }
}

// Load story metadata
export async function loadStoryMetadata(
  projectId: string,
  storyId: string
): Promise<StoryMetadata> {
  const file = getStoryMetadataFile(projectId, storyId)
  const raw = await fs.readFile(file, 'utf-8')
  return JSON.parse(raw) as StoryMetadata
}

// Save story metadata (updates story.json with parts index)
export async function saveStoryMetadata(
  projectId: string,
  storyId: string,
  metadata: StoryMetadata
): Promise<void> {
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    const file = getStoryMetadataFile(projectId, storyId)
    const updated: StoryMetadata = {
      ...metadata,
      updatedAt: new Date().toISOString(),
    }
    await writeJsonAtomic(file, updated)
  })
}

export async function updateStory(
  projectId: string,
  storyId: string,
  updates: Partial<Pick<StoryMeta, 'title'>>
): Promise<StoryMeta> {
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    assertUpdatesObject(updates, 'updateStory(updates)')

    const file = getStoryMetadataFile(projectId, storyId)
    const raw = await fs.readFile(file, 'utf-8')
    const existing = JSON.parse(raw) as StoryMetadata

    const updated: StoryMetadata = {
      ...existing,
      ...(updates as any),
      updatedAt: new Date().toISOString(),
    }

    await writeJsonAtomic(file, updated)

    return {
      id: updated.id,
      title: updated.title,
      createdAt: updated.createdAt,
      order: updated.order,
    }
  })
}

export async function deleteStory(
  projectId: string,
  storyId: string
): Promise<void> {
  const storyDir = getStoryDir(projectId, storyId)
  await fs.rm(storyDir, { recursive: true, force: true })
}

export async function reorderStories(
  projectId: string,
  idsInOrder: string[]
): Promise<void> {
  const queueKey = `stories:reorder:${projectId}`

  return writeQueue.enqueue(queueKey, async () => {
    const stories = await listStories(projectId)
    const byId = new Map(stories.map((s) => [s.id, s]))

    let index = 0
    for (const id of idsInOrder) {
      const s = byId.get(id)
      if (!s) continue
      s.order = index++

      const file = getStoryMetadataFile(projectId, id)
      const raw = await fs.readFile(file, 'utf-8')
      const json = JSON.parse(raw) as StoryMetadata
      json.order = s.order
      json.updatedAt = new Date().toISOString()

      await writeJsonAtomic(file, json)
    }
  })
}

// ---- metaDocs helpers (separated files) ----

export async function loadStoryMetaDoc(
  projectId: string,
  storyId: string,
  key: string
): Promise<JSONContent | null> {
  try {
    const file = getStoryMetaDocFile(projectId, storyId, key)
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw) as JSONContent
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // MetaDoc file doesn't exist yet
      return null
    }
    throw err
  }
}

export async function saveStoryMetaDoc(
  projectId: string,
  storyId: string,
  key: string,
  doc: JSONContent
): Promise<void> {
  // Each metaDoc has its own queue key to allow independent writes
  const queueKey = `metaDoc:${projectId}:${storyId}:${key}`

  return writeQueue.enqueue(queueKey, async () => {
    const file = getStoryMetaDocFile(projectId, storyId, key)
    await writeJsonAtomic(file, doc)
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
      await writeJsonAtomic(file, empty)
      return empty
    }
    // Unexpected error - log and throw
    console.error('[loadManifest] Failed to load manifest:', err)
    throw new Error('Failed to load manifest')
  }
}

export async function saveManifest(payload: { doc: JSONContent }): Promise<void> {
  // Use write queue to serialize manifest saves
  const queueKey = 'manifest:root'

  return writeQueue.enqueue(queueKey, async () => {
    const file = getManifestFile()

    const manifest: ManifestData = {
      doc: payload.doc,
      updatedAt: new Date().toISOString(),
    }

    await writeJsonAtomic(file, manifest)
  })
}

// ---- Root metaDocs (generic wrapper around Manifest) ----

export async function loadRootMetaDoc(key: string): Promise<JSONContent | null> {
  if (key === 'manifest') {
    const manifest = await loadManifest()
    return manifest.doc
  }

  // If you later add more root-level meta docs, extend this switch.
  return null
}

export async function saveRootMetaDoc(
  key: string,
  doc: JSONContent
): Promise<void> {
  if (key === 'manifest') {
    await saveManifest({ doc })
    return
  }

  // For unknown keys, you could either no-op or throw.
  // For now, let's just no-op.
}

// ---- Entity Indices (now inside story folder) ----

const getEntityIndexFile = (
  projectId: string,
  storyId: string,
  entityType: 'character' | 'location'
) => path.join(getStoryDir(projectId, storyId), `${entityType}s.json`)

export async function loadEntityIndex(
  projectId: string,
  storyId: string,
  entityType: 'character' | 'location'
): Promise<any | null> {
  const file = getEntityIndexFile(projectId, storyId, entityType)
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw)
  } catch (err: unknown) {
    // File doesn't exist yet - expected for new stories
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function saveEntityIndex(
  projectId: string,
  storyId: string,
  entityType: 'character' | 'location',
  index: any
): Promise<void> {
  // Use write queue to prevent race conditions
  const queueKey = `entityIndex:${projectId}:${storyId}:${entityType}`

  return writeQueue.enqueue(queueKey, async () => {
    const file = getEntityIndexFile(projectId, storyId, entityType)
    await writeJsonAtomic(file, index)
  })
}

// ---- Entity Documents (now inside story/entities folder) ----

// Entity document storage path (inside story folder)
const getEntityDocFile = (
  projectId: string,
  storyId: string,
  entityType: 'character' | 'location',
  entityId: string
) => path.join(getEntitiesDir(projectId, storyId), `${entityType}s`, `${sanitizeId(entityId)}.json`)

export async function loadEntityDoc(
  projectId: string,
  storyId: string,
  entityType: 'character' | 'location',
  entityId: string
): Promise<any | null> {
  const file = getEntityDocFile(projectId, storyId, entityType, entityId)
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw)
  } catch (err: unknown) {
    // File doesn't exist yet - expected for new entities
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw err
  }
}

export async function saveEntityDoc(
  projectId: string,
  storyId: string,
  entityType: 'character' | 'location',
  entityId: string,
  doc: any
): Promise<void> {
  // Use write queue to prevent race conditions
  const queueKey = `entityDoc:${projectId}:${storyId}:${entityType}:${entityId}`

  return writeQueue.enqueue(queueKey, async () => {
    const file = getEntityDocFile(projectId, storyId, entityType, entityId)

    // Ensure directory exists
    await fs.mkdir(path.dirname(file), { recursive: true })

    await writeJsonAtomic(file, doc)
  })
}

// ---- Parts (multi-part document support) ----

export async function loadPartDoc(
  projectId: string,
  storyId: string,
  partId: string
): Promise<PartDoc> {
  const file = getPartFile(projectId, storyId, partId)
  const raw = await fs.readFile(file, 'utf-8')
  return JSON.parse(raw) as PartDoc
}

export async function savePartDoc(
  projectId: string,
  storyId: string,
  partId: string,
  doc: JSONContent
): Promise<void> {
  // Save the timestamp once to keep it consistent across both operations
  const now = new Date().toISOString()

  // Save part document first (with its own queue key)
  const partQueueKey = `part:${projectId}:${storyId}:${partId}`
  await writeQueue.enqueue(partQueueKey, async () => {
    const file = getPartFile(projectId, storyId, partId)
    const partDoc: PartDoc = {
      id: partId,
      doc,
      updatedAt: now,
    }
    await writeJsonAtomic(file, partDoc)
  })

  // Update the part's updatedAt and wordCount in story metadata (separate queue key)
  const metadataQueueKey = `story:${projectId}:${storyId}`
  await writeQueue.enqueue(metadataQueueKey, async () => {
    // Load current story metadata
    const metadata = await loadStoryMetadata(projectId, storyId)

    // Find the part in the index and update its timestamp and word count
    const partIndex = metadata.parts.findIndex(p => p.id === partId)
    if (partIndex !== -1) {
      metadata.parts[partIndex].updatedAt = now
      metadata.parts[partIndex].wordCount = calculateWordCount(doc)
    }

    // Save updated metadata
    const file = getStoryMetadataFile(projectId, storyId)
    const updated: StoryMetadata = {
      ...metadata,
      updatedAt: now,
    }
    await writeJsonAtomic(file, updated)
  })
}

export async function createPart(
  projectId: string,
  storyId: string,
  order: number
): Promise<PartIndexEntry> {
  const partId = `part-${Date.now()}`
  const now = new Date().toISOString()

  const emptyDoc: JSONContent = {
    type: 'doc',
    content: [],
  }

  // Create part index entry
  const indexEntry: PartIndexEntry = {
    id: partId,
    order,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
  }

  // Use write queue to ensure atomic update of both part doc and story metadata
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    // Write part document to disk (directly, to avoid nested queue lock)
    const partFile = getPartFile(projectId, storyId, partId)
    const partDoc: PartDoc = {
      id: partId,
      doc: emptyDoc,
      updatedAt: now,
    }
    await writeJsonAtomic(partFile, partDoc)

    // Load current story metadata
    const metadata = await loadStoryMetadata(projectId, storyId)

    // Add new part to the index
    metadata.parts.push(indexEntry)

    // Save updated metadata directly (already in write queue)
    const file = getStoryMetadataFile(projectId, storyId)
    const updated: StoryMetadata = {
      ...metadata,
      updatedAt: new Date().toISOString(),
    }
    await writeJsonAtomic(file, updated)

    return indexEntry
  })
}

export async function deletePart(
  projectId: string,
  storyId: string,
  partId: string
): Promise<void> {
  // Use write queue to ensure atomic update of both part doc and story metadata
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    // Delete part document file
    const file = getPartFile(projectId, storyId, partId)
    await fs.rm(file, { force: true })

    // Load current story metadata
    console.log('[deletePart] Loading metadata for story:', storyId)
    const metadata = await loadStoryMetadata(projectId, storyId)
    console.log('[deletePart] Current parts.length:', metadata.parts.length)

    // Remove part from the index
    metadata.parts = metadata.parts.filter(p => p.id !== partId)
    console.log('[deletePart] After filter, parts.length:', metadata.parts.length)

    // Save updated metadata directly (already in write queue)
    const metadataFile = getStoryMetadataFile(projectId, storyId)
    const updated: StoryMetadata = {
      ...metadata,
      updatedAt: new Date().toISOString(),
    }
    console.log('[deletePart] Saving updated metadata with', updated.parts.length, 'parts')
    await writeJsonAtomic(metadataFile, updated)
    console.log('[deletePart] Metadata saved successfully')
  })
}

export async function reorderParts(
  projectId: string,
  storyId: string,
  idsInOrder: string[]
): Promise<void> {
  const queueKey = `story:${projectId}:${storyId}`

  return writeQueue.enqueue(queueKey, async () => {
    // Load current story metadata
    const metadata = await loadStoryMetadata(projectId, storyId)

    // Create a map of parts by ID for quick lookup
    const partsById = new Map(metadata.parts.map(p => [p.id, p]))

    // Create new parts array with updated order
    const reorderedParts: PartIndexEntry[] = []
    let newOrder = 0

    for (const id of idsInOrder) {
      const part = partsById.get(id)
      if (!part) continue // Skip invalid IDs

      // Update the order field
      reorderedParts.push({
        ...part,
        order: newOrder++,
        updatedAt: new Date().toISOString(),
      })
    }

    // Save updated metadata with reordered parts
    const file = getStoryMetadataFile(projectId, storyId)
    const updated: StoryMetadata = {
      ...metadata,
      parts: reorderedParts,
      updatedAt: new Date().toISOString(),
    }

    await writeJsonAtomic(file, updated)
  })
}