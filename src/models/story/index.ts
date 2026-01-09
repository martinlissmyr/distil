// src/models/story/index.ts
import type { JSONContent } from '@tiptap/react'

/**
 * Story metadata stored in story.json
 * Contains story-level info and the parts index
 */
export type StoryMetadata = {
  id: string
  title: string
  order: number
  partsEnabled: boolean
  parts: PartIndexEntry[]
  createdAt: string
  updatedAt: string
}

/**
 * Part index entry (lightweight projection stored in story.json)
 * Each entry represents a chapter/part with metadata but not the full content
 */
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

/**
 * Part document (full TipTap doc stored in parts/part-{id}.json)
 * Contains the actual prose content for a single part/chapter
 */
export type PartDoc = {
  id: string
  doc: JSONContent
  updatedAt: string
}

/**
 * Helper: Check if a part has content (non-empty document)
 */
export function hasContent(doc: JSONContent): boolean {
  if (!doc.content || doc.content.length === 0) return false

  // Check if there's any non-empty text content
  for (const node of doc.content) {
    if (node.type === 'paragraph') {
      if (node.content && node.content.length > 0) {
        for (const child of node.content) {
          if (child.type === 'text' && child.text && child.text.trim().length > 0) {
            return true
          }
        }
      }
    } else if (node.type === 'heading' || node.type === 'blockquote') {
      // Other block-level nodes with content
      if (node.content && node.content.length > 0) {
        return true
      }
    }
  }

  return false
}

/**
 * Helper: Check if a part's projection is stale (doc updated after projection)
 */
export function isProjectionStale(part: PartIndexEntry): boolean {
  if (!part.projection) return true

  const docUpdated = new Date(part.updatedAt)
  const projectionGenerated = new Date(part.projection.generatedAt)
  return docUpdated > projectionGenerated
}

/**
 * Helper: Calculate word count from TipTap document
 */
export function calculateWordCount(doc: JSONContent): number {
  let text = ''

  function extractText(node: JSONContent): void {
    if (node.type === 'text' && node.text) {
      text += node.text + ' '
    }

    if (node.content) {
      for (const child of node.content) {
        extractText(child)
      }
    }
  }

  extractText(doc)

  // Split by whitespace and filter out empty strings
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  return words.length
}

/**
 * Helper: Get part by ID from parts index
 */
export function getPartById(parts: PartIndexEntry[], partId: string): PartIndexEntry | undefined {
  return parts.find(p => p.id === partId)
}

/**
 * Helper: Get part by order (zero-indexed)
 */
export function getPartByOrder(parts: PartIndexEntry[], order: number): PartIndexEntry | undefined {
  return parts.find(p => p.order === order)
}

/**
 * Helper: Get next part in order
 */
export function getNextPart(parts: PartIndexEntry[], currentPartId: string): PartIndexEntry | null {
  const current = getPartById(parts, currentPartId)
  if (!current) return null

  const sortedParts = [...parts].sort((a, b) => a.order - b.order)
  const currentIndex = sortedParts.findIndex(p => p.id === currentPartId)

  if (currentIndex === -1 || currentIndex === sortedParts.length - 1) return null

  return sortedParts[currentIndex + 1]
}

/**
 * Helper: Get previous part in order
 */
export function getPreviousPart(parts: PartIndexEntry[], currentPartId: string): PartIndexEntry | null {
  const current = getPartById(parts, currentPartId)
  if (!current) return null

  const sortedParts = [...parts].sort((a, b) => a.order - b.order)
  const currentIndex = sortedParts.findIndex(p => p.id === currentPartId)

  if (currentIndex <= 0) return null

  return sortedParts[currentIndex - 1]
}

/**
 * Helper: Get first part in order
 */
export function getFirstPart(parts: PartIndexEntry[]): PartIndexEntry | null {
  if (parts.length === 0) return null

  const sortedParts = [...parts].sort((a, b) => a.order - b.order)
  return sortedParts[0]
}

/**
 * Helper: Get last part in order
 */
export function getLastPart(parts: PartIndexEntry[]): PartIndexEntry | null {
  if (parts.length === 0) return null

  const sortedParts = [...parts].sort((a, b) => a.order - b.order)
  return sortedParts[sortedParts.length - 1]
}

/**
 * Helper: Update part in parts array (immutable)
 */
export function updatePartInIndex(
  parts: PartIndexEntry[],
  partId: string,
  updates: Partial<PartIndexEntry>
): PartIndexEntry[] {
  return parts.map(part =>
    part.id === partId
      ? { ...part, ...updates, updatedAt: new Date().toISOString() }
      : part
  )
}

/**
 * Helper: Remove part from parts array (immutable)
 */
export function removePartFromIndex(parts: PartIndexEntry[], partId: string): PartIndexEntry[] {
  return parts.filter(part => part.id !== partId)
}

/**
 * Helper: Reorder parts array based on new ID order (immutable)
 */
export function reorderPartsIndex(parts: PartIndexEntry[], idsInOrder: string[]): PartIndexEntry[] {
  const byId = new Map(parts.map(p => [p.id, p]))

  return idsInOrder
    .map((id, index) => {
      const part = byId.get(id)
      return part ? { ...part, order: index } : null
    })
    .filter((p): p is PartIndexEntry => p !== null)
}
