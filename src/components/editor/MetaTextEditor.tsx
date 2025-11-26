// src/components/editor/MetaTextEditor.tsx
import { useEditor } from '@tiptap/react';
import { BaseEditor } from './BaseEditor';
import { EditorToolbar } from './EditorToolbar';
import { useEditorSync } from './useEditorSync';
import { defaultEmptyDoc } from './defaultEmptyDoc';

import {
  metaExtensions,
} from './extensions/metaExtensions';

import {
  Heading1,
  Heading2,
  List as ListIcon,
  ListOrdered,
  Minus,
} from 'lucide-react';

export const MetaTextEditor = ({
  doc,
  onChange,
  title = 'Meta',
  placeholder = "Start typing…",
  description,
  withChat = true,
  chatConfig,
}) => {

  const editor = useEditor({
    extensions: metaExtensions({ placeholder }),
    content: doc ?? defaultEmptyDoc,
  });

  useEditorSync(editor, doc, onChange);

  const toolbar = (
    <EditorToolbar
      items={[
        { id: 'h1', label: 'H1', icon: <Heading1 />, onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
        { id: 'h2', label: 'H2', icon: <Heading2 />, onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
        { id: 'body', label: 'Body', onClick: () => editor?.chain().focus().setParagraph().run() },
        { id: 'bullet', label: 'Bulleted', icon: <ListIcon />, onClick: () => editor?.chain().focus().toggleBulletList().run() },
        { id: 'ordered', label: 'Numbered', icon: <ListOrdered />, onClick: () => editor?.chain().focus().toggleOrderedList().run() },
        { id: 'rule', label: 'Rule', icon: <Minus />, onClick: () => editor?.chain().focus().setHorizontalRule().run() },
      ]}
    />
  );

  return (
    <BaseEditor
      editor={editor}
      title={title}
      showTitle={false}
      description={description}
      toolbar={toolbar}
      withChat={withChat}
      chatConfig={chatConfig}
    />
  );
};