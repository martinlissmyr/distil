// src/ui/documents/meta/MetaTextEditor.tsx
import { useEffect, useMemo, useCallback } from 'react';
import { WritingEnvironment } from '../../editor/WritingEnvironment';
import type { ChatConfig } from '../../../types/editor';

import { useAppStore, metaId } from '../../../state/useAppStore';
import type { MetaScope, MetaDocKey } from '../../../types/metaDoc';

type MetaTextEditorProps = {
  scope: MetaScope;          // where this metaDoc lives (root/project/story)
  metaKey: MetaDocKey;       // 'brief' | 'outline' | 'manifest' | etc
  title: string;
  placeholder?: string;
  withChat?: boolean;
  chatConfig?: ChatConfig;
};

/**
 * MetaTextEditor - High-level abstraction for editing meta documents
 *
 * Handles:
 * - Loading meta doc from Zustand store
 * - Syncing changes to store via WritingEnvironment
 * - Autosave with 800ms debounce
 * - Simple API: just pass scope + metaKey
 *
 * Uses WritingEnvironment internally for all editor functionality.
 */
export const MetaTextEditor: React.FC<MetaTextEditorProps> = ({
  scope,
  metaKey,
  title,
  placeholder,
  withChat = true,
  chatConfig,
}) => {
  const ensureMetaDocsLoaded = useAppStore((s) => s.ensureMetaDocsLoaded);
  const updateMetaDoc = useAppStore((s) => s.updateMetaDoc);
  const saveMetaDoc = useAppStore((s) => s.saveMetaDoc);

  // Stable id for this (scope, key) combo
  const id = useMemo(() => metaId(scope, metaKey), [
    scope.scope,
    // these properties only exist for some scopes, but that's fine
    (scope as any).projectId,
    (scope as any).storyId,
    metaKey,
  ]);

  // Subscribe directly to this metaDoc's state
  const metaDoc = useAppStore((s) => s.metaDocs[id]);

  // Initial load
  useEffect(() => {
    void ensureMetaDocsLoaded(scope, [metaKey]);
  }, [scope, metaKey, ensureMetaDocsLoaded]);

  // Update handler - memoized to prevent unnecessary re-renders
  const handleUpdate = useCallback((nextDoc: any) => {
    updateMetaDoc(scope, metaKey, nextDoc);
  }, [scope, metaKey, updateMetaDoc]);

  // Save handler - memoized to prevent unnecessary re-renders
  const handleSave = useCallback(() => {
    void saveMetaDoc(scope, metaKey);
  }, [scope, metaKey, saveMetaDoc]);

  // Calculate position key for scroll restoration
  const positionKey = useMemo(() => {
    if (scope.scope === 'story') {
      return `${scope.storyId}:${metaKey}`;
    }
    return `${metaKey}:${metaKey}`; // root sections
  }, [scope, metaKey]);

  return (
    <WritingEnvironment
      docKind={metaKey}
      content={metaDoc?.json}
      onUpdate={handleUpdate}
      onSave={handleSave}
      autosaveDelay={800}
      title={title}
      placeholder={placeholder}
      withChat={withChat}
      chatConfig={chatConfig}
      positionKey={positionKey}
    />
  );
};