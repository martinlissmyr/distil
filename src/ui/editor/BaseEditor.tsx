// src/ui/editor/BaseEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { ChatAside } from '../chat/ChatAside';
import type { ChatConfig } from './ProseEditor';
import { jsonToMarkdown } from '../../helpers/markdownUtils';
import { TopNavigation } from '../common/TopNavigation';
import styles from './BaseEditor.module.scss';
import { BubbleMenu } from '@tiptap/react/menus';
import { SearchPanel } from './SearchPanel';

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
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);

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

  // Keyboard listener for Cmd+F / Ctrl+F to toggle search panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchPanelOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
        className={styles.root}
      >
        <Box py={20} px={30} className={styles.topNavigation}>
          <TopNavigation
            title={title}
          />
        </Box>
        <Box
          className={styles.topOverlay}
          style={{
            opacity: isScrolled ? 1 : 0,
          }}
        />

        {searchPanelOpen && (
          <SearchPanel
            editor={editor}
            onClose={() => setSearchPanelOpen(false)}
          />
        )}

        <ScrollArea
          classNames={{
            root: styles.scrollAreaWrapper
          }}
          type="hover"
          scrollbarSize={10}
          styles={{
            thumb: {
              zIndex: 20, // Above topOverlay
            }
          }}
          onScrollPositionChange={({ y }) => {
            setIsScrolled(y > 0)}
          }
        >
          <Box className={styles.editor}>
            <EditorContent editor={editor} />
          </Box>
        </ScrollArea>

        {withChat && (
          <Box className={styles.chatAside}>
            <ChatAside
              {...chatConfig}
              fullTextMarkdown={fullTextMarkdown || ''}
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