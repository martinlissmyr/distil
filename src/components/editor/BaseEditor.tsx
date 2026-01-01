// src/components/editor/BaseEditor.tsx
import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { Box, Group } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { EditorChatAside } from './EditorChatAside';
import type { ChatConfig } from './ProseEditor';
import { jsonToMarkdown } from '../../helpers/markdownUtils';
import { TopNavigation } from '../common/TopNavigation';
import styles from './BaseEditor.module.scss';
import { BubbleMenu } from '@tiptap/react/menus';

import { useEditorChat } from '../../hooks/useEditorChat';

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

  // Track if user has ever made a selection (menu stays open once triggered)
  const hadSelectionRef = useRef(false);

  // Determine schema based on editor kind
  const schema = chatConfig?.kind === 'prose' ? 'prose' : 'meta';

  // Wizard integration via reusable hook
  const { handleOpenWizard } = useEditorChat({ chatConfig, editor: editor ?? undefined });

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
    <>
      <BubbleMenu
        editor={editor}
        updateDelay={250}
        options={{
          placement: 'top',
          offset: 8,
          flip: true,
        }}
        className={styles.toolbarBubble}
        data-ui="bubble-menu"
      >
        {toolbar}
      </BubbleMenu>
      <Box
        className={`${styles.root} ${isScrolled ? styles.scrolled : ''}`}
        style={{ '--aside-offset': `${asideOffset}px` } as React.CSSProperties}
      >
        <Box py={20} px={30} className={styles.topNavigation}>
          <TopNavigation
            title={title}
          />
        </Box>
        <Box className={styles.topOverlay} />

        <Box
          ref={scrollRef}
          className={styles.scrollArea}
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
        >
          <Box className={styles.editor}>
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
              onOpenWizard={handleOpenWizard} // always wired when chat is on
            />
          </Box>
        )}
      </Box>
    </>
  );
};