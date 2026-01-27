// electron/fs/authorBundle.ts
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import type { JSONContent } from '@tiptap/react'
import { readJson } from './fs'

// Re-export types from fs.ts
export type ManifestData = {
  doc: JSONContent
  updatedAt: string
}

export type ChatThread = {
  threadId: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    actualPrompt?: string
    // Note: ephemeral and suggestions are NOT persisted
  }>
  createdAt: string
  lastUpdated: string
}

export type AppSettingsFile = {
  language?: string
  uiSchema?: string
}

// Get the fixed author bundle path
export function getAuthorBundlePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || app.getPath('home')
  const dirName = app.isPackaged ? 'Distil' : 'Distil-Dev'
  return path.join(home, dirName, 'author.distilauthor')
}

// Individual file paths within author bundle
export function getAuthorManifestFile(): string {
  return path.join(getAuthorBundlePath(), 'manifest.json')
}

export function getAuthorSettingsFile(): string {
  return path.join(getAuthorBundlePath(), 'settings.json')
}

export function getAuthorChatsDir(): string {
  return path.join(getAuthorBundlePath(), 'chats')
}

export function getAuthorChatFile(chatName: string): string {
  return path.join(getAuthorChatsDir(), `${chatName}.json`)
}

// Safe atomic JSON write helper
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

// Initialize author bundle (create if missing)
export async function ensureAuthorBundle(): Promise<void> {
  const bundlePath = getAuthorBundlePath()

  try {
    await fs.access(bundlePath)
    // Bundle exists
  } catch {
    // Create bundle directory structure
    await fs.mkdir(bundlePath, { recursive: true })
    await fs.mkdir(getAuthorChatsDir(), { recursive: true })

    // Initialize with empty manifest if needed
    const manifestFile = getAuthorManifestFile()
    try {
      await fs.access(manifestFile)
    } catch {
      const emptyManifest: ManifestData = {
        doc: {
          type: 'doc',
          content: []
        },
        updatedAt: new Date().toISOString()
      }
      await writeJsonAtomic(manifestFile, emptyManifest)
    }

    // Initialize with default settings if needed
    const settingsFile = getAuthorSettingsFile()
    try {
      await fs.access(settingsFile)
    } catch {
      const defaultSettings: AppSettingsFile = {
        language: 'sv',
        uiSchema: 'traditional'
      }
      await writeJsonAtomic(settingsFile, defaultSettings)
    }
  }
}

// Read manifest from author bundle
export async function readAuthorManifest(): Promise<ManifestData> {
  await ensureAuthorBundle()
  return await readJson<ManifestData>(getAuthorManifestFile())
}

// Write manifest to author bundle
export async function writeAuthorManifest(data: ManifestData): Promise<void> {
  await ensureAuthorBundle()
  await writeJsonAtomic(getAuthorManifestFile(), data)
}

// Read settings from author bundle
export async function readAuthorSettings(): Promise<AppSettingsFile> {
  await ensureAuthorBundle()
  return await readJson<AppSettingsFile>(getAuthorSettingsFile())
}

// Write settings to author bundle
export async function writeAuthorSettings(settings: AppSettingsFile): Promise<void> {
  await ensureAuthorBundle()
  await writeJsonAtomic(getAuthorSettingsFile(), settings)
}
