// src/ui/editor/BaseEditor.tsx
import React, { useState } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { ChatAside } from '../chat/ChatAside';
import type { ChatConfig } from '../../types/editor';
import { TopNavigation } from '../common/TopNavigation';
import styles from './BaseEditor.module.scss';
import { BubbleMenu } from '@tiptap/react/menus';
import { SearchPanel } from './SearchPanel';

import { useEditorChat } from '../../hooks/useEditorChat';
import { useMarkdownExtraction } from '../../hooks/useMarkdownExtraction';
import { useEditorSearch } from '../../hooks/useEditorSearch';

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