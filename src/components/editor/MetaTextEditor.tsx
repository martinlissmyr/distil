// src/components/editor/MetaTextEditor.tsx
import { useEffect, useMemo } from 'react';
import { useEditor } from '@tiptap/react';
import { BaseEditor } from './BaseEditor';
import { EditorToolbar } from './EditorToolbar';
import { useEditorSync } from './useEditorSync';
import { defaultEmptyDoc } from './defaultEmptyDoc';
import { metaExtensions } from './extensions/metaExtensions';

import {
  Heading1,
  Heading2,
  List as ListIcon,
  ListOrdered,
  Minus,
} from 'lucide-react';

import { useAppStore, metaId } from '../../state/useAppStore';
import type { MetaScope, MetaDocKey } from '../../types/metaDoc';

type MetaTextEditorProps = {
  scope: MetaScope;          // where this metaDoc lives (root/project/story)
  metaKey: MetaDocKey;       // 'brief' | 'outline' | 'manifest' | etc
  title: string;
  placeholder?: string;
  withChat?: boolean;
  chatConfig?: any;
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
    scope.kind,
    // these properties only exist for some kinds, but that's fine
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

  const editor = useEditor({
    extensions: metaExtensions({ placeholder }),
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

  const toolbar = (
    <EditorToolbar
      items={[
        {
          id: 'h1',
          label: 'H1',
          icon: <Heading1 />,
          onClick: () =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          id: 'h2',
          label: 'H2',
          icon: <Heading2 />,
          onClick: () =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          id: 'body',
          label: 'Body',
          onClick: () => editor?.chain().focus().setParagraph().run(),
        },
        {
          id: 'bullet',
          label: 'Bulleted',
          icon: <ListIcon />,
          onClick: () =>
            editor?.chain().focus().toggleBulletList().run(),
        },
        {
          id: 'ordered',
          label: 'Numbered',
          icon: <ListOrdered />,
          onClick: () =>
            editor?.chain().focus().toggleOrderedList().run(),
        },
        {
          id: 'rule',
          label: 'Rule',
          icon: <Minus />,
          onClick: () => editor?.chain().focus().setHorizontalRule().run(),
        },
      ]}
    />
  );

  return (
    <BaseEditor
      editor={editor}
      title={title}
      showTitle={false}
      toolbar={toolbar}
      withChat={withChat}
      chatConfig={chatConfig}
    />
  );
};