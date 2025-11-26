// src/components/editor/ProseEditor.tsx
import { useEditor } from '@tiptap/react';
import { BaseEditor } from './BaseEditor';
import { EditorToolbar } from './EditorToolbar';
import { useEditorSync } from './useEditorSync';
import { defaultEmptyDoc } from './defaultEmptyDoc';

import { proseExtensions } from './extensions/proseExtensions';

import { Heading2, Heading3 } from 'lucide-react';

export const ProseEditor = ({
  doc,
  onChange,
  title = 'New text',
  placeholder = "Start typing…",
  withChat = true,
  chatConfig,
}) => {

  const editor = useEditor({
    extensions: proseExtensions({ placeholder }),
    content: doc ?? defaultEmptyDoc,
  });

  useEditorSync(editor, doc, onChange);

  const toolbar = (
    <EditorToolbar
      items={[
        { id: 'h2', label: 'H2', icon: <Heading2 />, onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
        { id: 'h3', label: 'H3', icon: <Heading3 />, onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
        { id: 'body', label: 'Body', onClick: () => editor?.chain().focus().setParagraph().run() },
      ]}
    />
  );

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