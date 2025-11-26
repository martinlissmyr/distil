// src/components/editor/BaseEditor.tsx
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Box, Group } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import { EditorChatAside } from './EditorChatAside';
import '../../styles/Editor.scss';

export type BaseEditorProps = {
  editor: any; // TipTap Editor instance
  title?: string;
  showTitle?: boolean;

  toolbar: React.ReactNode;

  description?: React.ReactNode;
  withChat?: boolean;
  chatConfig?: any;
};

export const BaseEditor: React.FC<BaseEditorProps> = ({
  editor,
  title,
  showTitle = true,
  toolbar,
  description,
  withChat = true,
  chatConfig,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [asideOffset, setAsideOffset] = useState<number>(12); // px
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [fullTextMarkdown, setFullTextMarkdown] = useState('');
  const [selectionMarkdown, setSelectionMarkdown] = useState('');
  const [hasSelection, setHasSelection] = useState(false);

  if (!editor) return null;

  // Measure scrollbar width on mount + resize
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollbarOffset = () => {
      if (!scrollRef.current) return;
      const node = scrollRef.current;
      const scrollbarWidth = node.offsetWidth - node.clientWidth;

      // Compensate if the scrollbar takes layout space
      setAsideOffset(scrollbarWidth + 12);
    };

    updateScrollbarOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarOffset();
    });

    resizeObserver.observe(el);
    window.addEventListener('resize', updateScrollbarOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollbarOffset);
    };
  }, []);

  // Keep full text + selection markdown in sync with editor
  useEffect(() => {
    if (!editor) return;

    const updateFullMarkdown = () => {
      try {
        const fullMd = editor.getMarkdown();
        setFullTextMarkdown(fullMd);
      } catch (e) {
        console.warn('getMarkdown failed', e);
        setFullTextMarkdown('');
      }
    };

    // tiny throttle for selection updates
    let selTimeout: number | null = null;

    const updateSelectionMarkdown = () => {
      const state = editor.state;
      const { from, to } = state.selection;
      const hasSel = from !== to;
      setHasSelection(hasSel);

      if (!hasSel) {
        // Optional: keep last highlight, just don’t change it
        // If you want to clear it instead, uncomment this:
        // const trClear = state.tr.setMeta(persistentSelectionPluginKey, { type: 'clear' });
        // editor.view.dispatch(trClear);
        setSelectionMarkdown('');
        return;
      }

      // Tell the plugin where the persistent selection should be
      /*const tr = state.tr.setMeta(persistentSelectionPluginKey, {
        type: 'set',
        from,
        to,
      });
      editor.view.dispatch(tr);*/

      try {
        const slice = state.doc.cut(from, to).toJSON();
        const selMd = editor.markdown.serialize(slice);
        setSelectionMarkdown(selMd);
      } catch (e) {
        console.warn('serialize selection to markdown failed', e);
        setSelectionMarkdown('');
      }
    };

    const handleSelectionUpdate = () => {
      if (selTimeout != null) {
        window.clearTimeout(selTimeout);
      }
      selTimeout = window.setTimeout(updateSelectionMarkdown, 50);
    };

    // initial
    updateFullMarkdown();
    updateSelectionMarkdown();

    editor.on('update', () => {
      updateFullMarkdown();
      // selection may have changed as part of update too:
      handleSelectionUpdate();
    });

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('update', updateFullMarkdown);
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (selTimeout != null) window.clearTimeout(selTimeout);
    };
  }, [editor]);

  return (
    <Box
      // Root editor container
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-editor)',

        // Responsive side gutter used for both text padding and chat width calc
        '--editor-gutter': 'min(110px, 6vw)' as any,
        '--editor-width': 'min(680px, 40vw)' as any,
        '--aside-offset': `${asideOffset}px` as any,
      }}
    >
      {/* TOOLBAR PILL */}
      <Group
        p="xs"
        style={{
          position: 'absolute',
          top: 16,
          left: 'calc(var(--editor-gutter) - 16px)',
          zIndex: 20,
          background: 'var(--editor-overlay)',
          borderRadius: 56,
          gap: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {toolbar}
      </Group>

      {/* TOP OVERLAY */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          pointerEvents: 'none',
          zIndex: 15,
          opacity: isScrolled ? 1 : 0,
          transition: 'opacity 120ms ease-out',
          background:
            'linear-gradient(to bottom, var(--bg-editor-faded), var(--bg-editor-transparent))',
        }}
      />

      {/* SCROLLABLE AREA */}
      <Box
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          paddingTop: 120,
          paddingBottom: 24,
          cursor: 'text',
          color: 'var(--text)',
        }}
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
      >
        <Box
          className="editor"
          style={{
            width: 'calc(var(--editor-width) + var(--editor-gutter) * 2)',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {showTitle && (
            <h1
              className="editorTitle"
              style={{
                width: 'var(--editor-width)',
                margin: '0 auto 22px auto',
              }}
            >
              {title}
            </h1>
          )}
          <EditorContent editor={editor} />
        </Box>
      </Box>

      {/* CHAT ASIDE – takes up the remaining space to the right */}
      {withChat && (
        <Box
          style={{
            position: 'absolute',
            top: '12px',
            right: 'var(--aside-offset)',
            bottom: '12px',
            width:
              'calc(100% - var(--aside-offset) - (var(--editor-gutter) * 2 + var(--editor-width)))',
            zIndex: 20,
            display: 'flex',
          }}
        >
          <EditorChatAside
            {...chatConfig}
            fullTextMarkdown={fullTextMarkdown}
            selectionMarkdown={selectionMarkdown}
            hasSelection={hasSelection}
          />
        </Box>
      )}
    </Box>
  );
};