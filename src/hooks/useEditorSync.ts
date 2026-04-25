import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';

function hasSelectionOutsideEditor(editor: Editor): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const node = container.nodeType === Node.ELEMENT_NODE
    ? container
    : container.parentNode;

  return Boolean(node && !editor.view.dom.contains(node));
}

export function useEditorSync(
  editor: Editor | null,
  doc: JSONContent | undefined,
  onChange: (doc: JSONContent) => void
) {
  const [selectionRevision, setSelectionRevision] = useState(0);
  const hasDeferredSyncRef = useRef(false);

  // Pull new props into editor
  const syncDocToEditor = useCallback(() => {
    if (!editor || !doc) return false;
    const current = editor.getJSON();
    if (JSON.stringify(current) === JSON.stringify(doc)) {
      hasDeferredSyncRef.current = false;
      return true;
    }

    if (hasSelectionOutsideEditor(editor)) {
      hasDeferredSyncRef.current = true;
      return false;
    }

    const { from, to } = editor.state.selection;
    const wasFocused = editor.isFocused;
    editor.commands.setContent(doc, { emitUpdate: false });
    if (wasFocused) {
      const maxPos = editor.state.doc.content.size;
      const nextFrom = Math.min(from, maxPos);
      const nextTo = Math.min(to, maxPos);
      editor.commands.setTextSelection({
        from: nextFrom,
        to: nextTo,
      });
    }
    hasDeferredSyncRef.current = false;
    return true;
  }, [doc, editor]);

  useEffect(() => {
    syncDocToEditor();
  }, [syncDocToEditor, selectionRevision]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      if (!hasDeferredSyncRef.current) return;
      if (hasSelectionOutsideEditor(editor)) return;
      setSelectionRevision((revision) => revision + 1);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editor]);

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
