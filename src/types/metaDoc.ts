// src/types/metaDoc.ts
import type { MetaDocKey as MetaDocKeyImport } from '../models/docs';
import type { DocRef } from './docRef';

// Re-export for convenience
export type { DocRef } from './docRef';
export type MetaDocKey = MetaDocKeyImport;

/**
 * @deprecated Use DocRef from './docRef' instead.
 * This alias exists for backward compatibility during migration.
 */
export type MetaScope = DocRef;

export type MetaDocJson = any;

export type MetaDocState = {
  scope: DocRef;
  key: MetaDocKey;
  json: MetaDocJson | null;
  markdown: string | null;
  isLoading: boolean;
  error: string | null;
};