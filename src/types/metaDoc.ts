// src/types/metaDoc.ts
import type { JSONContent } from '@tiptap/react';
import type { MetaDocKey as MetaDocKeyImport } from '../models/docs';
import type { DocRef } from './docRef';

// Re-export for convenience
export type { DocRef } from './docRef';
export type MetaDocKey = MetaDocKeyImport;

/**
 * Semantic alias for DocRef when used with metaDoc APIs.
 *
 * MetaScope pairs with MetaDocKey in metaDoc-specific functions:
 * - getMetaDoc(scope: MetaScope, key: MetaDocKey)
 * - ensureMetaDocsLoaded(scope: MetaScope, keys: MetaDocKey[])
 *
 * This is a permanent semantic alias, not for backward compatibility.
 * Use DocRef for general document references, MetaScope for metaDoc APIs.
 */
export type MetaScope = DocRef;

export type MetaDocJson = JSONContent;

export type MetaDocState = {
  scope: DocRef;
  key: MetaDocKey;
  json: MetaDocJson | null;
  markdown: string | null;
  isLoading: boolean;
  error: string | null;
};
