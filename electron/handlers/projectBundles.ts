// electron/handlers/projectBundles.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { writeJsonAtomic, readJson } from '../fs/fs'
import {
  readRegistry,
  addOrUpdateProject,
  removeProject,
  type ProjectRegistryEntry
} from '../fs/registry'

// Get the root Distil directory where project bundles live
function getDistilRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || app.getPath('home')
  const dirName = app.isPackaged ? 'Distil' : 'Distil-Dev'
  return path.join(home, dirName)
}

// Sanitize project name for use as filename
function sanitizeProjectName(name: string): string {
  // Replace invalid filename characters with underscores
  // Keep: letters, numbers, spaces, hyphens, underscores
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim()
    .substring(0, 200) // Limit length
}

// Generate bundle filename from project name (with conflict handling)
async function generateBundleName(projectName: string): Promise<string> {
  const baseName = sanitizeProjectName(projectName)
  const distilRoot = getDistilRoot()

  // Try base name first
  let candidateName = baseName
  let bundlePath = path.join(distilRoot, `${candidateName}.distilproject`)

  // If exists, append numbers until we find an available name
  let counter = 2
  while (await fs.access(bundlePath).then(() => true).catch(() => false)) {
    candidateName = `${baseName} ${counter}`
    bundlePath = path.join(distilRoot, `${candidateName}.distilproject`)
    counter++
  }

  return candidateName
}

// Generate unique project ID
function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * List all projects from registry
 */
export async function listProjectsFromRegistry(): Promise<ProjectRegistryEntry[]> {
  const registry = await readRegistry()
  // Sort by order field
  return registry.projects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Create a new project bundle
 */
export async function createProjectBundle(name: string): Promise<ProjectRegistryEntry> {
  const distilRoot = getDistilRoot()
  await fs.mkdir(distilRoot, { recursive: true })

  const existing = await listProjectsFromRegistry()
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.order ?? 0)) : 0

  const id = generateProjectId()
  const bundleName = await generateBundleName(name)
  const bundlePath = path.join(distilRoot, `${bundleName}.distilproject`)

  // Create bundle directory structure
  await fs.mkdir(bundlePath, { recursive: true })
  await fs.mkdir(path.join(bundlePath, 'stories'), { recursive: true })
  await fs.mkdir(path.join(bundlePath, 'chats'), { recursive: true })

  // Create project.json
  const projectMeta = {
    id,
    name,
    createdAt: new Date().toISOString()
  }

  await writeJsonAtomic(path.join(bundlePath, 'project.json'), projectMeta)

  // Add to registry
  const registryEntry: ProjectRegistryEntry = {
    id,
    name,
    bundlePath,
    order: maxOrder + 1
  }

  await addOrUpdateProject(registryEntry)

  // Add to macOS Recent Documents
  app.addRecentDocument(bundlePath)

  return registryEntry
}

/**
 * Update project metadata
 */
export async function updateProjectBundle(
  projectId: string,
  updates: { name?: string }
): Promise<ProjectRegistryEntry> {
  const registry = await readRegistry()
  const entry = registry.projects.find(p => p.id === projectId)

  if (!entry) {
    throw new Error(`Project ${projectId} not found in registry`)
  }

  // Update project.json in bundle
  const projectFile = path.join(entry.bundlePath, 'project.json')
  const projectMeta = await readJson<any>(projectFile)

  if (updates.name !== undefined) {
    projectMeta.name = updates.name
  }

  await writeJsonAtomic(projectFile, projectMeta)

  // Update registry
  const updatedEntry: ProjectRegistryEntry = {
    ...entry,
    name: updates.name ?? entry.name
  }

  await addOrUpdateProject(updatedEntry)

  return updatedEntry
}

/**
 * Delete project bundle
 */
export async function deleteProjectBundle(projectId: string): Promise<void> {
  const registry = await readRegistry()
  const entry = registry.projects.find(p => p.id === projectId)

  if (!entry) {
    throw new Error(`Project ${projectId} not found in registry`)
  }

  // Delete bundle directory
  await fs.rm(entry.bundlePath, { recursive: true, force: true })

  // Remove from registry
  await removeProject(projectId)
}

/**
 * Reorder projects
 */
export async function reorderProjectBundles(idsInOrder: string[]): Promise<void> {
  const registry = await readRegistry()

  // Update order for each project
  for (let i = 0; i < idsInOrder.length; i++) {
    const projectId = idsInOrder[i]
    const entry = registry.projects.find(p => p.id === projectId)

    if (entry) {
      await addOrUpdateProject({
        ...entry,
        order: i + 1
      })
    }
  }
}
