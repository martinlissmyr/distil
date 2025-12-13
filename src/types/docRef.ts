// src/types/docRef.ts
import type { DocKindId } from '../models/docs';

/**
 * Runtime identifier for a specific document instance.
 *
 * This type consolidates what was previously split across MetaScope and EditorDocRef.
 * It identifies which specific document you're working with by combining:
 * - scope: where the document lives (root/project/story level)
 * - IDs: projectId and/or storyId when needed
 * - docKind: optionally, which kind of document (manifest, brief, outline, etc.)
 *
 * Examples:
 * - Root manifest: { scope: 'root', docKind: 'manifest' }
 * - Story brief: { scope: 'story', projectId: '123', storyId: '456', docKind: 'brief' }
 * - Any story doc: { scope: 'story', projectId: '123', storyId: '456' }
 */
export type DocRef =
  | { scope: 'root'; docKind?: DocKindId }
  | { scope: 'project'; projectId: string; docKind?: DocKindId }
  | { scope: 'story'; projectId: string; storyId: string; docKind?: DocKindId };

/**
 * Helper type: DocRef with docKind required.
 * Use when you need to know both the location AND the kind of document.
 */
export type DocRefWithKind = DocRef & { docKind: DocKindId };

/**
 * Backward compatibility alias for MetaScope.
 * Will be removed after full migration.
 *
 * @deprecated Use DocRef instead
 */
export type MetaScope = DocRef;
