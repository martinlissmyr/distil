// src/ui/editor/WritingEnvironment.tsx
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { ChatAside } from '../chat/ChatAside';
import type { ChatConfig } from '../../types/editor';
import type { DocKindId } from '../../models/docs';
import { TopNavigation } from '../common/TopNavigation';
import { SearchPanel } from './primitives/SearchPanel';
import { useEditorChat } from '../../hooks/useEditorChat';
import { useMarkdownExtraction } from '../../hooks/useMarkdownExtraction';
import { useEditorSearch } from '../../hooks/useEditorSearch';
import { useEditorSync } from '../../hooks/useEditorSync';
import { useNavigation } from '../../hooks/useNavigation';
import { createExtensionsFromConfig, createToolbarFromConfig } from './primitives/editorConfigFactory';
import { getDocKind, isRichTextDoc, isMultiPartTextDoc } from '../../models/docs';
import { defaultEmptyDoc } from './primitives/defaultEmptyDoc';
import styles from './WritingEnvironment.module.scss';

export type WritingEnvironmentProps = {
  /** Document kind (determines editor configuration) */
  docKind: DocKindId;

  /** Current document content (TipTap JSON) */
  content: JSONContent | undefined;

  /** Called when content changes (for sync to store) */
  onUpdate: (json: JSONContent) => void;

  /** Called to save document (triggered by autosave) */
  onSave: () => void;

  /** Autosave delay in milliseconds (default: 800) */
  autosaveDelay?: number;

  /** Title displayed in top navigation */
  title: string;

  /** Placeholder text when editor is empty (overrides config default) */
  placeholder?: string;

  /** Chat configuration */
  chatConfig?: ChatConfig;

  /** Optional custom navigation component (overrides default TopNavigation) */
  navigation?: React.ReactNode;

  /** Optional bottom navigation (e.g., chapter controls for prose) */
  bottomNavigation?: React.ReactNode;

  /** Whether to show chat aside (default: true) */
  withChat?: boolean;

  /** Optional: Custom render function for editor content (for part previews, etc) */
  renderEditorContent?: (editor: React.ReactNode) => React.ReactNode;

  /** Optional: Ref for scroll viewport (for scroll anchoring in StoryTextView) */
  scrollViewportRef?: React.RefObject<HTMLDivElement>;

  /** Optional: Key for saving/restoring editor position */
  positionKey?: string;
};

/**
 * WritingEnvironment - Complete writing interface with editor + chat
 *
 * Owns the full editor lifecycle:
 * - Creates TipTap editor with configuration from docKind
 * - Syncs editor changes to parent via onUpdate
 * - Autosaves via onSave with configurable delay
 * - Manages search panel (Cmd+F / Ctrl+F)
 * - Extracts markdown (full text + selection)
 * - Integrates ChatAside
 * - Provides top navigation and optional bottom navigation
 *
 * This is the core layout component for all editing views.
 * MetaTextEditor and StoryTextView build on top of this.
 */
export const WritingEnvironment: React.FC<WritingEnvironmentProps> = ({
  docKind,
  content,
  onUpdate,
  onSave,
  autosaveDelay = 800,
  title,
  placeholder,
  chatConfig,
  navigation,
  bottomNavigation,
  withChat = true,
  renderEditorContent,
  scrollViewportRef,
  positionKey,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRestoringPosition, setIsRestoringPosition] = useState(true);
  const hasRestoredPositionRef = useRef(false);

  // Create internal viewport ref, use external if provided
  const internalViewportRef = useRef<HTMLDivElement>(null);
  const viewportRef = scrollViewportRef || internalViewportRef;

  // Navigation store actions
  const { saveEditorPosition, getEditorPosition } = useNavigation();

  // Get editor config from doc model
  const docKindConfig = getDocKind(docKind);

  // Type guard: only rich text and multi-part text docs have editorConfig
  if (!isRichTextDoc(docKindConfig) && !isMultiPartTextDoc(docKindConfig)) {
    throw new Error(
      `WritingEnvironment called with non-editable doc kind: "${docKind}". ` +
      `Entity index docs should use custom entity management UI.`
    );
  }

  const editorConfig = { ...docKindConfig.editorConfig };

  // Override placeholder if provided as prop
  if (placeholder !== undefined) {
    editorConfig.placeholder = placeholder;
  }

  // Create TipTap editor instance
  const editor = useEditor({
    extensions: createExtensionsFromConfig(editorConfig),
    content: content ?? defaultEmptyDoc,
    editorProps: {
      attributes: {
        // ensure browser spellcheck is enabled
        spellcheck: 'true',
        lang: 'sv',
      },
    },
  });

  // Sync editor changes to parent
  useEditorSync(editor, content ?? defaultEmptyDoc, onUpdate);

  // Autosave when content changes
  useEffect(() => {
    if (!content) return;

    const timeout = setTimeout(() => {
      onSave();
    }, autosaveDelay);

    return () => clearTimeout(timeout);
  }, [content, onSave, autosaveDelay]);

  // Save editor position continuously while mounted
  useEffect(() => {
    if (!positionKey || !editor) return;

    const savePosition = () => {
      if (!viewportRef?.current || !editor) return;

      saveEditorPosition(positionKey, {
        scrollTop: viewportRef.current.scrollTop,
        cursorFrom: editor.state.selection.from,
        cursorTo: editor.state.selection.to,
      });
    };

    let intervalId: NodeJS.Timeout | null = null;

    // Wait a bit for viewport to be ready, then start saving periodically
    const timeoutId = setTimeout(() => {
      if (!viewportRef?.current) return;

      // Save immediately
      savePosition();

      // Set up interval to save periodically (every 2 seconds)
      intervalId = setInterval(savePosition, 2000);
    }, 200);

    // Cleanup: clear timeout/interval and save one final time
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      savePosition();
    };
  }, [editor, positionKey, saveEditorPosition]);

  // Restore editor position on mount
  useLayoutEffect(() => {
    if (!positionKey || !editor || !content) {
      setIsRestoringPosition(false);
      return;
    }
    if (hasRestoredPositionRef.current) {
      setIsRestoringPosition(false);
      return;
    }

    const savedPosition = getEditorPosition(positionKey);

    // Use timing pattern from useChatScroll for glitch-free restoration
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Check if viewport is available now (after timeout)
        if (!editor || !viewportRef?.current) {
          setIsRestoringPosition(false);
          return;
        }

        const viewport = viewportRef.current;

        // Get editor element position (universal minimum scroll for all cases)
        const editorElement = editor.view.dom;
        const editorTop = editorElement.offsetTop;

        // Restore scroll first
        if (savedPosition) {
          // Restore scroll, but ensure we're at least at editor top
          const targetScroll = Math.max(savedPosition.scrollTop, editorTop);
          viewport.scrollTop = targetScroll;
        } else {
          // No saved position - scroll to editor top (past any previews)
          viewport.scrollTop = editorTop;
        }

        hasRestoredPositionRef.current = true;
        setIsRestoringPosition(false);

        // Restore cursor position after a slight delay to ensure useEditorSync has completed
        // useEditorSync resets cursor to 0, so we need to restore after it runs
        if (savedPosition) {
          setTimeout(() => {
            if (!editor) return;
            const maxPos = editor.state.doc.content.size;
            const validFrom = Math.min(savedPosition.cursorFrom, maxPos);
            const validTo = Math.min(savedPosition.cursorTo, maxPos);

            // If it's just a cursor (no selection), use focus with position
            if (validFrom === validTo) {
              editor.commands.focus(validFrom);
            } else {
              // For text selection, use chain
              editor.chain().focus().setTextSelection({ from: validFrom, to: validTo }).run();
            }
          }, 50);
        }
      }, 100);
    });
  }, [editor, content, positionKey, getEditorPosition]);

  // Reset restoration state when position key changes
  useEffect(() => {
    hasRestoredPositionRef.current = false;
    setIsRestoringPosition(true);
  }, [positionKey]);

  // Create toolbar from config
  const toolbar = createToolbarFromConfig(editorConfig, editor);

  // Determine schema based on editor kind
  const schema = chatConfig?.kind === 'prose' ? 'prose' : 'meta';

  // Wizard integration via reusable hook
  const { handleNavigate, handleOpenWizard } = useEditorChat({ chatConfig, editor: editor ?? undefined });

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
          viewportRef={viewportRef}
          classNames={{
            root: styles.scrollAreaWrapper
          }}
          type="hover"
          scrollbarSize={10}
          styles={{
            thumb: {
              zIndex: 20, // Above topOverlay
            },
            viewport: {
              opacity: isRestoringPosition ? 0 : 1,
              transition: 'opacity 150ms ease-in',
            }
          }}
          onScrollPositionChange={({ y }) => {
            setIsScrolled(y > 0)
          }}
        >
          <Box className={styles.editor}>
            {renderEditorContent ? (
              renderEditorContent(<EditorContent editor={editor} />)
            ) : (
              <EditorContent editor={editor} />
            )}
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
              onNavigate={handleNavigate}
              onOpenWizard={handleOpenWizard}
            />
          </Box>
        )}
      </Box>
    </>
  );
};
