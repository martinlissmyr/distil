import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';

export function useEditorSync(
  editor: Editor | null,
  doc: JSONContent | undefined,
  onChange: (doc: JSONContent) => void
) {
  // Pull new props into editor
  useEffect(() => {
    if (!editor || !doc) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(doc)) return;
    editor.commands.setContent(doc, { emitUpdate: false });
    editor.commands.setTextSelection(0); // Otherwise all new content is selected
  }, [doc, editor]);

  // Push editor changes up
  useEffect(() => {
    if (!editor) return;
    const handler = () => onChange(editor.getJSON());
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, onChange]);
}