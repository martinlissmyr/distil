// src/components/editor/BaseEditor.tsx
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Box, Group } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import { EditorChatAside } from './EditorChatAside';
import type { ChatConfig } from './ProseEditor';
import styles from './BaseEditor.module.scss';

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

  if (!editor) return null;

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