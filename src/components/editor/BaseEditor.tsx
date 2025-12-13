// src/components/editor/BaseEditor.tsx
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Box, Group } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { EditorChatAside } from './EditorChatAside';
import type { ChatConfig } from './ProseEditor';
import { jsonToMarkdown } from '../../helpers/markdownUtils';
import styles from './BaseEditor.module.scss';

export type BaseEditorProps = {
  editor: Editor | null;
  title: string;
  showTitle?: boolean;
  toolbar?: React.ReactNode;
  withChat?: boolean;
  chatConfig?: ChatConfig;
};

export const BaseEditor: React.FC<BaseEditorProps> = ({
  editor,
  title,
  showTitle = true,
  toolbar,
  withChat = true,
  chatConfig,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [asideOffset, setAsideOffset] = useState(12);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [fullTextMarkdown, setFullTextMarkdown] = useState<string | null>(null);
  const [selectionMarkdown, setSelectionMarkdown] = useState('');
  const [hasSelection, setHasSelection] = useState(false);

  // Determine schema based on editor kind
  const schema = chatConfig?.kind === 'prose' ? 'prose' : 'meta';

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

    // Initial extraction
    updateMarkdown();

    // Listen to editor updates
    const handleUpdate = () => {
      updateMarkdown();
    };

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

      if (hasActiveSelection) {
        try {
          // Get only the selected content
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

    // Initial check
    updateSelection();

    // Listen to selection updates
    const handleSelectionUpdate = () => {
      updateSelection();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, schema]);

  // Measure scrollbar width on mount + resize
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const scrollbarWidth = el.offsetWidth - el.clientWidth;
      setAsideOffset(scrollbarWidth + 12);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!editor) return null;

  return (
    <Box
      className={`${styles.root} ${isScrolled ? styles.scrolled : ''}`}
      style={{
        '--aside-offset': `${asideOffset}px`,
      } as React.CSSProperties}
    >
      <Group className={styles.toolbarPill} p="xs">
        {toolbar}
      </Group>

      <Box className={styles.topOverlay} />

      <Box
        ref={scrollRef}
        className={styles.scrollArea}
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
      >
        <Box className={styles.editor}>
          {showTitle && <h1 className={styles.editorTitle}>{title}</h1>}
          <EditorContent editor={editor} />
        </Box>
      </Box>

      {withChat && (
        <Box className={styles.chatAside}>
          <EditorChatAside
            {...chatConfig}
            fullTextMarkdown={fullTextMarkdown}
            selectionMarkdown={selectionMarkdown}
            hasSelection={hasSelection}
            title={title}
            isTextLoaded={fullTextMarkdown !== null}
            editor={editor}
          />
        </Box>
      )}
    </Box>
  );
};