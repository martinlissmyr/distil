// electron/handlers/bundles.ts
import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { readJson, writeJsonAtomic } from '../fs/fs'
import {
  readRegistry,
  addOrUpdateProject,
  updateBundlePath,
  removeProject
} from '../fs/registry'

// Generate unique project ID
function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Get the root Distil directory where project bundles live
function getDistilRoot(): string {
  const home = process.env.HOME || process.env.USERPROFILE || app.getPath('home')
  const dirName = app.isPackaged ? 'Distil' : 'Distil-Dev'
  return path.join(home, dirName)
}

/**
 * Open a project bundle with move/copy detection
 * Returns the project ID that should be opened
 */
export async function openProjectBundle(bundlePath: string): Promise<string> {
  // Read project metadata from the bundle
  const projectFile = path.join(bundlePath, 'project.json')
  const project = await readJson<{ id: string; name: string }>(projectFile)
  const registry = await readRegistry()

  // Check if this specific bundle path is known
  const existingEntry = registry.projects.find(p => p.bundlePath === bundlePath)

  if (existingEntry) {
    // Known bundle, update lastOpened and return
    await addOrUpdateProject({
      ...existingEntry,
      lastOpened: new Date().toISOString()
    })
    return existingEntry.id
  }

  // New bundle path - check if ID is already used (indicates copy or move)
  const idConflict = registry.projects.find(p => p.id === project.id)

  if (idConflict) {
    // Check if old path still exists
    const oldPathExists = await fs.access(idConflict.bundlePath).then(() => true).catch(() => false)

    if (oldPathExists) {
      // COPY: Both paths exist - regenerate ID for the copy
      const newId = generateProjectId()
      // Use bundle filename (without extension) as the project name
      const bundleFileName = path.basename(bundlePath, '.distilproject')
      project.id = newId
      project.name = bundleFileName
      await writeJsonAtomic(projectFile, project)
      console.log(`[bundles] Detected copied bundle, generated new ID: ${newId}`)

      // Add to registry
      await addOrUpdateProject({
        id: newId,
        name: bundleFileName,
        bundlePath: bundlePath,
        lastOpened: new Date().toISOString()
      })

      return newId
    } else {
      // MOVE: Old path gone - update registry with new path
      console.log(`[bundles] Detected moved bundle from ${idConflict.bundlePath} to ${bundlePath}`)
      await updateBundlePath(project.id, bundlePath)
      await addOrUpdateProject({
        ...idConflict,
        bundlePath: bundlePath,
        lastOpened: new Date().toISOString()
      })

      return project.id
    }
  }

  // Completely new project - add to registry
  await addOrUpdateProject({
    id: project.id,
    name: project.name,
    bundlePath: bundlePath,
    lastOpened: new Date().toISOString()
  })

  return project.id
}

/**
 * Scan ~/Distil/ for project bundles and sync with registry
 * Called at startup in background
 */
export async function syncRegistryWithDistilFolder(): Promise<void> {
  try {
    const distilRoot = getDistilRoot()

    // Ensure directory exists
    try {
      await fs.access(distilRoot)
    } catch {
      await fs.mkdir(distilRoot, { recursive: true })
      return // Empty directory, nothing to sync
    }

    // Find all .distilproject bundles
    const entries = await fs.readdir(distilRoot, { withFileTypes: true })
    const bundles = entries
      .filter(e => e.isDirectory() && e.name.endsWith('.distilproject'))
      .map(e => path.join(distilRoot, e.name))

    const registry = await readRegistry()

    // Add or update each bundle found
    for (const bundlePath of bundles) {
      try {
        const projectFile = path.join(bundlePath, 'project.json')
        const project = await readJson<{ id: string; name: string }>(projectFile)
        const existing = registry.projects.find(p => p.id === project.id)

        if (!existing) {
          // New bundle found - add to registry
          console.log(`[bundles] Found new bundle: ${bundlePath}`)
          await addOrUpdateProject({
            id: project.id,
            name: project.name,
            bundlePath: bundlePath
          })
        } else if (existing.bundlePath !== bundlePath) {
          // ID exists but path is different - check if it's a copy or move
          const oldPathExists = await fs.access(existing.bundlePath).then(() => true).catch(() => false)

          if (oldPathExists) {
            // COPY: Both paths exist - regenerate ID for this bundle
            const newId = generateProjectId()
            // Use bundle filename (without extension) as the project name
            const bundleFileName = path.basename(bundlePath, '.distilproject')
            console.log(`[bundles] Detected copied bundle, regenerating ID: ${bundlePath}`)
            project.id = newId
            project.name = bundleFileName
            await writeJsonAtomic(projectFile, project)
            await addOrUpdateProject({
              id: newId,
              name: bundleFileName,
              bundlePath: bundlePath
            })
          } else {
            // MOVE: Old path gone - check if it was renamed
            const newBundleName = path.basename(bundlePath, '.distilproject')
            const oldBundleName = path.basename(existing.bundlePath, '.distilproject')

            if (newBundleName !== oldBundleName) {
              // Bundle was renamed in Finder - update project name to match
              console.log(`[bundles] Detected bundle rename: ${oldBundleName} → ${newBundleName}`)
              project.name = newBundleName
              await writeJsonAtomic(projectFile, project)
            } else {
              console.log(`[bundles] Updated bundle path: ${bundlePath}`)
            }

            // Update registry with new path and potentially new name
            await addOrUpdateProject({
              ...existing,
              name: project.name,
              bundlePath: bundlePath
            })
          }
        }
      } catch (err) {
        console.error(`[bundles] Error reading bundle ${bundlePath}:`, err)
      }
    }
  } catch (err) {
    console.error('[bundles] Error syncing registry:', err)
  }
}

/**
 * Handle missing bundle - try to find it or prompt user
 * Returns true if recovered, false if removed from registry
 */
export async function handleMissingBundle(
  projectId: string,
  expectedPath: string
): Promise<boolean> {
  // Step 1: Try to find it in ~/Distil/
  const found = await findBundleById(projectId)

  if (found) {
    console.log(`[bundles] Found missing bundle at: ${found}`)
    await updateBundlePath(projectId, found)
    return true
  }

  // Step 2: Not found - present options to user
  const choice = await dialog.showMessageBox({
    type: 'warning',
    title: 'Project Not Found',
    message: `Cannot find project at: ${expectedPath}`,
    detail: 'The project file may have been moved, renamed, or deleted.',
    buttons: ['Locate Manually...', 'Remove from List', 'Cancel'],
    defaultId: 0,
    cancelId: 2
  })

  if (choice.response === 0) {
    // Locate manually
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Distil Projects', extensions: ['distilproject'] }],
      message: 'Locate the project bundle'
    })

    if (result.filePaths.length > 0) {
      const newPath = result.filePaths[0]

      // Verify it's the same project by ID
      try {
        const projectFile = path.join(newPath, 'project.json')
        const project = await readJson<{ id: string }>(projectFile)

        if (project.id === projectId) {
          await updateBundlePath(projectId, newPath)
          return true
        } else {
          await dialog.showMessageBox({
            type: 'error',
            title: 'Wrong Project',
            message: 'This is a different project.',
            detail: 'Please select the correct project bundle.'
          })
          return false
        }
      } catch (err) {
        console.error('[bundles] Error verifying project:', err)
        return false
      }
    }
    return false
  }

  if (choice.response === 1) {
    // Remove from list
    await removeProject(projectId)
    return false
  }

  // Cancel
  return false
}

/**
 * Find a bundle by its project ID in the Distil directory
 */
async function findBundleById(projectId: string): Promise<string | null> {
  try {
    const distilRoot = getDistilRoot()
    const entries = await fs.readdir(distilRoot, { withFileTypes: true })
    const bundles = entries
      .filter(e => e.isDirectory() && e.name.endsWith('.distilproject'))
      .map(e => path.join(distilRoot, e.name))

    for (const bundlePath of bundles) {
      try {
        const projectFile = path.join(bundlePath, 'project.json')
        const project = await readJson<{ id: string }>(projectFile)
        if (project.id === projectId) {
          return bundlePath
        }
      } catch {
        // Skip invalid bundles
      }
    }

    return null
  } catch {
    return null
  }
}
