// src/hooks/usePreloadMetaDocs.ts
import { useEffect } from 'react';
import { useAppStore } from '../state/useAppStore';
import type { MetaScope, MetaDocKey } from '../types/metaDoc';

export function usePreloadMetaDocs(scope: MetaScope, keys: MetaDocKey[]) {
  const ensureMetaDocsLoaded = useAppStore((s) => s.ensureMetaDocsLoaded);

  useEffect(() => {
    if (!keys.length) return;
    void ensureMetaDocsLoaded(scope, keys);
  }, [scope.kind, 
      'projectId' in scope ? scope.projectId : undefined,
      'storyId' in scope ? (scope as any).storyId : undefined,
      keys.join('|'),
      ensureMetaDocsLoaded]);
}