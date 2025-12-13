// src/components/editor/MetaTextEditor.tsx
import { useEffect, useMemo } from 'react';
import { useEditor } from '@tiptap/react';
import { BaseEditor } from './BaseEditor';
import { useEditorSync } from './useEditorSync';
import { defaultEmptyDoc } from './defaultEmptyDoc';
import { createExtensionsFromConfig, createToolbarFromConfig } from './editorConfigFactory';
import { getDocKind } from '../../models/docs';
import type { ChatConfig } from './ProseEditor';

import { useAppStore, metaId } from '../../state/useAppStore';
import type { MetaScope, MetaDocKey } from '../../types/metaDoc';

type MetaTextEditorProps = {
  scope: MetaScope;          // where this metaDoc lives (root/project/story)
  metaKey: MetaDocKey;       // 'brief' | 'outline' | 'manifest' | etc
  title: string;
  placeholder?: string;
  withChat?: boolean;
  chatConfig?: ChatConfig;
};

export const MetaTextEditor: React.FC<MetaTextEditorProps> = ({
  scope,
  metaKey,
  title,
  placeholder = 'Start typing…',
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

  // Get editor config from doc model based on metaKey
  const docKind = getDocKind(metaKey);
  const editorConfig = useMemo(() => {
    const config = { ...docKind.editorConfig };
    // Override placeholder if provided as prop
    if (placeholder !== undefined) {
      config.placeholder = placeholder;
    }
    return config;
  }, [docKind, placeholder]);

  const editor = useEditor({
    extensions: createExtensionsFromConfig(editorConfig),
    content: metaDoc?.json ?? defaultEmptyDoc,
  });

  // Keep external store in sync when user types
  useEditorSync(editor, metaDoc?.json ?? defaultEmptyDoc, (nextDoc) => {
    updateMetaDoc(scope, metaKey, nextDoc);
  });

  // Autosave when metaDoc content changes
  useEffect(() => {
    if (!metaDoc?.json) return;

    const timeout = setTimeout(() => {
      void saveMetaDoc(scope, metaKey);
    }, 800);

    return () => clearTimeout(timeout);
  }, [metaDoc?.json, scope, metaKey, saveMetaDoc]);

  const toolbar = createToolbarFromConfig(editorConfig, editor);

  return (
    <BaseEditor
      editor={editor}
      title={title}
      showTitle={true}
      toolbar={toolbar}
      withChat={withChat}
      chatConfig={chatConfig}
    />
  );
};