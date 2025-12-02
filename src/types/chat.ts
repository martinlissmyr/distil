// src/types/chat.ts
import type { MetaDocKey } from './metaDoc';

/**
 * Type of editor for context-aware prompting
 * Extends MetaDocKey (manifest, brief, outline, world) with 'prose' for story text
 */
export type EditorKind = MetaDocKey | 'prose';

/**
 * Scope of the user's question (full text or selected portion)
 */
export type QuestionScope = 'selection' | 'text';
