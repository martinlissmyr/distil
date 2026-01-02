// src/ui/editor/ProseEditor.tsx
import { useEditor } from '@tiptap/react';
import { BaseEditor } from './BaseEditor';
import { useEditorSync } from '../../hooks/useEditorSync';
import { defaultEmptyDoc } from './defaultEmptyDoc';
import { createExtensionsFromConfig, createToolbarFromConfig } from './editorConfigFactory';
import { getDocKind } from '../../models/docs';
import type { EditorKind } from '../../types/chat';

export type ChatConfig = {
  kind: EditorKind;
  storyId?: string;
  storyTitle?: string;
  projectId?: string;
  projectName?: string;
  onNavigate?: (target: string) => void;
};

export const ProseEditor = ({
  doc,
  onChange,
  title = 'New text',
  placeholder,
  withChat = true,
  chatConfig,
}) => {
  // Get editor config from doc model
  const docKind = getDocKind('prose');
  // 'prose' is always a rich text doc, so editorConfig is guaranteed to exist
  // TypeScript can't infer this from the literal 'prose', so we assert
  const editorConfig = { ...(docKind as any).editorConfig };

  // Override placeholder if provided as prop
  if (placeholder !== undefined) {
    editorConfig.placeholder = placeholder;
  }

  const editor = useEditor({
    extensions: createExtensionsFromConfig(editorConfig),
    content: doc ?? defaultEmptyDoc,
  });

  useEditorSync(editor, doc, onChange);

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