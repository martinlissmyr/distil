import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { readJson } from './fs'

// Types
export type ProjectRegistryEntry = {
  id: string
  name: string
  bundlePath: string
  lastOpened?: string
  favorite?: boolean
  order?: number
}

export type ProjectRegistry = {
  projects: ProjectRegistryEntry[]
}

// ---- Safe/atomic JSON helpers ----

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const dir = path.dirname(file)
  await fs.mkdir(dir, { recursive: true })

  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
  const json = JSON.stringify(data, null, 2)

  // Write to temp, then rename into place (atomic on most FS)
  await fs.writeFile(tmp, json, 'utf-8')

  try {
    await fs.rename(tmp, file)
  } catch (e: unknown) {
    // Windows can fail if destination exists
    const err = e as NodeJS.ErrnoException
    if (err?.code === 'EEXIST' || err?.code === 'EPERM') {
      await fs.rm(file, { force: true }).catch(() => {})
      await fs.rename(tmp, file)
    } else {
      // Clean up temp on unexpected errors
      await fs.rm(tmp, { force: true }).catch(() => {})
      throw e
    }
  }
}

// Path helper
const getRegistryPath = () => {
  const appDataDir = app.getPath('appData')
  const distilDir = path.join(appDataDir, 'Distil')
  return path.join(distilDir, 'project-registry.json')
}

// Read registry (returns empty if missing)
export async function readRegistry(): Promise<ProjectRegistry> {
  try {
    return await readJson<ProjectRegistry>(getRegistryPath())
  } catch {
    return { projects: [] }
  }
}

// Write registry
export async function writeRegistry(registry: ProjectRegistry): Promise<void> {
  await writeJsonAtomic(getRegistryPath(), registry)
}

// Update registry with function
export async function updateRegistry(
  updater: (registry: ProjectRegistry) => void
): Promise<void> {
  const registry = await readRegistry()
  updater(registry)
  await writeRegistry(registry)
}

// Helper: Add or update project entry
export async function addOrUpdateProject(entry: ProjectRegistryEntry): Promise<void> {
  await updateRegistry(registry => {
    const index = registry.projects.findIndex(p => p.id === entry.id)
    if (index >= 0) {
      registry.projects[index] = entry
    } else {
      registry.projects.push(entry)
    }
  })
}

// Helper: Remove project entry
export async function removeProject(projectId: string): Promise<void> {
  await updateRegistry(registry => {
    registry.projects = registry.projects.filter(p => p.id !== projectId)
  })
}

// Helper: Update bundle path
export async function updateBundlePath(projectId: string, newPath: string): Promise<void> {
  await updateRegistry(registry => {
    const project = registry.projects.find(p => p.id === projectId)
    if (project) {
      project.bundlePath = newPath
    }
  })
}
