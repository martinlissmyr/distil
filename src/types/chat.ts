// src/types/chat.ts
import type { DocKindId } from '../models/docs';

/**
 * The editor always works on a specific document kind.
 * (manifest, brief, outline, world, prose)
 */
export type EditorKind = DocKindId;

/**
 * Scope of the user's question (full text or selected portion)
 */
export type QuestionScope = 'selection' | 'text';