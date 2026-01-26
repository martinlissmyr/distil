/**
 * Export-related types shared between frontend and Electron contexts
 */

import type { JSONContent } from '@tiptap/react';
import type { StoryMetadata } from './story';

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
