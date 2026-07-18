// src/hooks/usePreloadMetaDocs.ts
import { useEffect } from 'react';
import { useAppStore } from '../state/useAppStore';
import type { MetaScope, MetaDocKey } from '../types/metaDoc';

export function usePreloadMetaDocs(scope: MetaScope, keys: MetaDocKey[]) {
  const ensureMetaDocsLoaded = useAppStore((s) => s.ensureMetaDocsLoaded);
  const projectId = scope.scope !== 'root' ? scope.projectId : undefined;
  const storyId = scope.scope === 'story' ? scope.storyId : undefined;
  const keySignature = keys.join('|');

  useEffect(() => {
    if (!keys.length) return;
    void ensureMetaDocsLoaded(scope, keys);
  }, [scope, keys, keySignature, projectId, storyId, ensureMetaDocsLoaded]);
}
