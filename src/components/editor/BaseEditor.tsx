// src/components/editor/BaseEditor.tsx
import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { Box, Group } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { EditorChatAside } from './EditorChatAside';
import type { ChatConfig } from './ProseEditor';
import { jsonToMarkdown } from '../../helpers/markdownUtils';
import styles from './BaseEditor.module.scss';

import type { OpenWizardCommand } from '../../wizards/types';
import type { WizardContext } from '../../wizards/types';
import { useAppStore } from '../../state/useAppStore';

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

  // ✅ Wizard opener (shared for all BaseEditor usage)
  const startWizard = useAppStore((s) => (s as any).startWizard);

  const handleOpenWizard = useCallback(
    (cmd: OpenWizardCommand) => {
      if (!editor) return;

      if (!startWizard || typeof startWizard !== 'function') {
        console.warn('[BaseEditor] startWizard not found on store');
        return;
      }

      // Build ctx.ref in the shape your storeGlue expects.
      // Assumes chatConfig carries projectId/storyId when in story scope.
      const projectId = (chatConfig as any)?.projectId as string | undefined;
      const storyId = (chatConfig as any)?.storyId as string | undefined;

      const ref =
        projectId && storyId
          ? ({ scope: 'story', projectId, storyId } as const)
          : ({ scope: 'root' } as const);

      const ctx: WizardContext = {
        ref,
        targetEditor: editor,
      } as any;

      startWizard(cmd.wizardId, ctx);
    },
    [startWizard, editor, chatConfig]
  );

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
    <Box
      className={`${styles.root} ${isScrolled ? styles.scrolled : ''}`}
      style={{ '--aside-offset': `${asideOffset}px` } as React.CSSProperties}
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
            onOpenWizard={handleOpenWizard} // ✅ always wired when chat is on
          />
        </Box>
      )}
    </Box>
  );
};