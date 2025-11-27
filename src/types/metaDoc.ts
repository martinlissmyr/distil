// src/types/metaDoc.ts
export type MetaScope =
  | { kind: 'root' }                      // e.g. manifest, global notes
  | { kind: 'project'; projectId: string }
  | { kind: 'story'; projectId: string; storyId: string };

export type MetaDocKey = string; // 'manifest' | 'brief' | 'outline' | etc

export type MetaDocJson = any;

export type MetaDocState = {
  scope: MetaScope;
  key: MetaDocKey;
  json: MetaDocJson | null;
  markdown: string | null;
  isLoading: boolean;
  error: string | null;
};