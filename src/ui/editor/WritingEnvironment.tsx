// src/ui/editor/WritingEnvironment.tsx
import React, { useState } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { ChatAside } from '../chat/ChatAside';
import type { ChatConfig } from '../../types/editor';
import { TopNavigation } from '../common/TopNavigation';
import { SearchPanel } from './SearchPanel';
import { useEditorChat } from '../../hooks/useEditorChat';
import { useMarkdownExtraction } from '../../hooks/useMarkdownExtraction';
import { useEditorSearch } from '../../hooks/useEditorSearch';
import styles from './WritingEnvironment.module.scss';

export type WritingEnvironmentProps = {
  /** TipTap editor instance */
  editor: Editor | null;

  /** Title displayed in top navigation */
  title: string;

  /** Toolbar content shown in bubble menu */
  toolbar?: React.ReactNode;

  /** Chat configuration */
  chatConfig?: ChatConfig;

  /** Optional custom navigation component (overrides default TopNavigation) */
  navigation?: React.ReactNode;

  /** Optional bottom navigation (e.g., chapter controls for prose) */
  bottomNavigation?: React.ReactNode;

  /** Whether to show chat aside (default: true) */
  withChat?: boolean;
};

/**
 * WritingEnvironment - Complete writing interface with editor + chat
 *
 * Provides:
 * - TipTap editor with bubble menu
 * - Search panel (Cmd+F / Ctrl+F)
 * - Markdown extraction (full text + selection)
 * - ChatAside integration
 * - Top navigation
 * - Optional bottom navigation
 *
 * This is the core layout component for all editing views.
 * MetaTextEditor and StoryTextView build on top of this.
 */
export const WritingEnvironment: React.FC<WritingEnvironmentProps> = ({
  editor,
  title,
  toolbar,
  chatConfig,
  navigation,
  bottomNavigation,
  withChat = true,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  // Determine schema based on editor kind
  const schema = chatConfig?.kind === 'prose' ? 'prose' : 'meta';

  // Wizard integration via reusable hook
  const { handleOpenWizard } = useEditorChat({ chatConfig, editor: editor ?? undefined });

  // Extract markdown from editor content and selection
  const { fullTextMarkdown, selectionMarkdown, hasSelection } = useMarkdownExtraction(editor, schema);

  // Search panel management
  const { searchPanelOpen, setSearchPanelOpen } = useEditorSearch();

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

      <Box className={styles.root}>
        {/* Top navigation */}
        <Box py={20} px={30} className={styles.topNavigation}>
          {navigation || <TopNavigation title={title} />}
        </Box>

        {/* Top gradient overlay (shows when scrolled) */}
        <Box
          className={styles.topOverlay}
          style={{
            opacity: isScrolled ? 1 : 0,
          }}
        />

        {/* Search panel */}
        {searchPanelOpen && (
          <SearchPanel
            editor={editor}
            onClose={() => setSearchPanelOpen(false)}
          />
        )}

        {/* Scrollable editor area */}
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
            setIsScrolled(y > 0)
          }}
        >
          <Box className={styles.editor}>
            <EditorContent editor={editor} />
          </Box>
        </ScrollArea>

        {/* Bottom navigation (optional, for chapter controls etc) */}
        {bottomNavigation && (
          <Box py={20} px={30} className={styles.bottomNavigation}>
            {bottomNavigation}
          </Box>
        )}

        {/* Chat aside */}
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
              onOpenWizard={handleOpenWizard}
            />
          </Box>
        )}
      </Box>
    </>
  );
};
