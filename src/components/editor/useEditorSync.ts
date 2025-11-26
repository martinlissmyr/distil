import { useEffect } from 'react';

export function useEditorSync(editor, doc, onChange) {
  // Pull new props into editor
  useEffect(() => {
    if (!editor || !doc) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(doc)) return;
    editor.commands.setContent(doc, false);
  }, [doc, editor]);

  // Push editor changes up
  useEffect(() => {
    if (!editor) return;
    const handler = () => onChange(editor.getJSON());
    editor.on('update', handler);
    return () => editor.off('update', handler);
  }, [editor, onChange]);
}