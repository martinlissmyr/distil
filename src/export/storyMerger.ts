// src/export/storyMerger.ts
import type { JSONContent } from '@tiptap/react';
import type { StoryMetadata, PartIndexEntry } from '../models/story';
import { client } from '../api/client';
import { getDocKind } from '../models/docs';
import { createExtensionsFromConfig } from '../ui/editor/primitives/editorConfigFactory';

/**
 * Represents a merged part with its content ready for export
 */
export interface MergedPart {
  partId: string;
  partIndex: number;
  partTitle: string; // e.g., "Chapter 1", "Chapter 2"
  content: JSONContent;
}

/**
 * Complete story content ready for export
 */
export interface MergedStory {
  title: string;
  parts: MergedPart[];
  metadata: StoryMetadata;
}

/**
 * Get chapter title for a part
 * Shared logic used by StoryPreview and export
 */
export function getPartTitle(partIndex: number, totalParts: number): string {
  // Only show chapter titles if there are multiple parts
  if (totalParts <= 1) {
    return '';
  }
  return `Kapitel ${partIndex + 1}`;
}

/**
 * Merge all parts of a story into a single structure
 * Reusable by both StoryPreview and export functionality
 */
export async function mergeStoryParts(
  projectId: string,
  storyId: string
): Promise<MergedStory> {
  // Load story metadata
  const metadataResponse = await client.loadStoryMetadata(projectId, storyId);
  if (!metadataResponse.ok) {
    throw new Error(`Failed to load story metadata: ${metadataResponse.error}`);
  }

  const metadata = metadataResponse.data;
  const parts = metadata.parts || [];

  // Sort parts by order
  const sortedParts = [...parts].sort((a, b) => a.order - b.order);

  // Load all part documents in parallel
  const partResults = await Promise.all(
    sortedParts.map(async (part, index) => {
      const response = await client.loadPartDoc(projectId, storyId, part.id);

      if (!response.ok) {
        console.error(`[EXPORT] Failed to load part ${part.id}:`, response.error);
        return null;
      }

      // response.data is PartDoc, which has { id, doc: JSONContent, updatedAt }
      const content = response.data.doc?.content ?? [];

      return {
        partId: part.id,
        partIndex: index,
        partTitle: getPartTitle(index, sortedParts.length),
        content: { type: 'doc', content } as JSONContent,
      } satisfies MergedPart;
    })
  );

  // Filter out failed loads
  const successfulParts = partResults.filter(
    (part): part is MergedPart => part !== null
  );

  return {
    title: metadata.title,
    parts: successfulParts,
    metadata,
  };
}

/**
 * Get TipTap extensions for prose documents
 * Used to ensure consistent rendering across preview and export
 */
export function getProseExtensions() {
  const docKind = getDocKind('prose');
  const editorConfig = (docKind as any).editorConfig;
  return createExtensionsFromConfig(editorConfig);
}
