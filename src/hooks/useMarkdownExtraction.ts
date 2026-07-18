// src/hooks/useMarkdownExtraction.ts
import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { jsonToMarkdown } from '../helpers/markdownUtils';

export type MarkdownExtractionResult = {
  fullTextMarkdown: string | null;
  selectionMarkdown: string;
  hasSelection: boolean;
  hadSelectionOnce: boolean;
};

/**
 * Hook to extract markdown from editor content and selection
 *
 * @param editor - TipTap editor instance
 * @param schema - Which schema to use for markdown conversion ('prose' or 'meta')
 * @returns Object with full text markdown, selection markdown, and selection state
 */
export function useMarkdownExtraction(
  editor: Editor | null,
  schema: 'prose' | 'meta' = 'meta'
): MarkdownExtractionResult {
  const [fullTextMarkdown, setFullTextMarkdown] = useState<string | null>(null);
  const [selectionMarkdown, setSelectionMarkdown] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const [hadSelectionOnce, setHadSelectionOnce] = useState(false);

  // Track if user has ever made a selection (menu stays open once triggered)
  const hadSelectionRef = useRef(false);

  // Extract full text markdown when editor content changes
  useEffect(() => {
    if (!editor) return;

    const updateMarkdown = () => {
      try {
        const json = editor.getJSON();
        const markdown = jsonToMarkdown(json, schema);
        setFullTextMarkdown(markdown);
      } catch (error) {
        console.error('Failed to extract markdown:', error);
        setFullTextMarkdown('');
      }
    };

    updateMarkdown();

    const handleUpdate = () => updateMarkdown();
    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, schema]);

  // Track selection changes
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      const hasActiveSelection = from !== to;
      setHasSelection(hasActiveSelection);

      // Update ref for bubble menu - once set, stays true forever
      if (hasActiveSelection) {
        hadSelectionRef.current = true;
        setHadSelectionOnce(true);
      }

      if (hasActiveSelection) {
        try {
          const slice = editor.state.doc.slice(from, to);
          const selectedContent = slice.content.toJSON();
          const markdown = jsonToMarkdown({ type: 'doc', content: selectedContent }, schema);
          setSelectionMarkdown(markdown);
        } catch (error) {
          console.error('Failed to extract selection markdown:', error);
          setSelectionMarkdown('');
        }
      } else {
        setSelectionMarkdown('');
      }
    };

    updateSelection();

    const handleSelectionUpdate = () => updateSelection();
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, schema]);

  return {
    fullTextMarkdown,
    selectionMarkdown,
    hasSelection,
    hadSelectionOnce,
  };
}
