// src/ui/story/StoryTextView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StorySectionShell } from './StorySectionShell';
import { useEditorChat } from '../../hooks/useEditorChat';
import { useEditorSync } from '../../hooks/useEditorSync';
import { ChatAside } from '../chat/ChatAside';
import { TopNavigation, type TopNavigationMenuItem } from '../common/TopNavigation';
import { useChapterNavigationButtons } from './ChapterNavigation';
import { ChapterOverview } from './ChapterOverview';
import { defaultEmptyDoc } from '../editor/defaultEmptyDoc';
import { createExtensionsFromConfig, createToolbarFromConfig } from '../editor/editorConfigFactory';
import { getDocKind } from '../../models/docs';
import { jsonToMarkdown } from '../../helpers/markdownUtils';
import { useAppStore } from '../../state/useAppStore';
import styles from '../editor/BaseEditor.module.scss';

type StoryTextViewProps = {
  projectId: string;
  storyId: string;
  doc: any;
  onChange: (doc: any) => void;
  title: string;
};

type Subview = 'editor' | 'chapters';

export const StoryTextView: React.FC<StoryTextViewProps> = ({
  projectId,
  storyId,
  doc,
  onChange,
  title,
}) => {
  const [subview, setSubview] = useState<Subview>('editor');
  const [isScrolled, setIsScrolled] = useState(false);
  const [fullTextMarkdown, setFullTextMarkdown] = useState<string | null>(null);
  const [selectionMarkdown, setSelectionMarkdown] = useState('');
  const [hasSelection, setHasSelection] = useState(false);

  // Track if user has ever made a selection (menu stays open once triggered)
  const hadSelectionRef = useRef(false);

  // Get parts state from app store
  const currentStoryMetadata = useAppStore((state) => state.currentStoryMetadata);
  const currentPartId = useAppStore((state) => state.currentPartId);
  const currentPartDoc = useAppStore((state) => state.currentPartDoc);
  const loadStoryMetadata = useAppStore((state) => state.loadStoryMetadata);
  const setCurrentPartId = useAppStore((state) => state.setCurrentPartId);
  const loadCurrentPartDoc = useAppStore((state) => state.loadCurrentPartDoc);
  const enableParts = useAppStore((state) => state.enableParts);

  // Load story metadata on mount
  useEffect(() => {
    loadStoryMetadata(projectId, storyId);
  }, [projectId, storyId, loadStoryMetadata]);

  // Reset subview to editor when navigation changes (e.g., returning from chapters view)
  useEffect(() => {
    setSubview('editor');
  }, [projectId, storyId]);

  const partsEnabled = currentStoryMetadata?.partsEnabled ?? false;
  const parts = currentStoryMetadata?.parts ?? [];
  const currentPartIndex = parts.findIndex((p) => p.id === currentPartId);
  const totalParts = parts.length;
  const partTitle = 'Chapter ' + (currentPartIndex + 1);

  // Get editor config from doc model
  const docKind = getDocKind('prose');
  const editorConfig = { ...(docKind as any).editorConfig };
  editorConfig.placeholder = "Start writing your story...";

  const editor = useEditor({
    extensions: createExtensionsFromConfig(editorConfig),
    content: doc ?? defaultEmptyDoc,
  });

  useEditorSync(editor, doc, onChange);

  // Load part document when currentPartId changes
  useEffect(() => {
    if (!currentPartId) return;
    void loadCurrentPartDoc(projectId, storyId, currentPartId);
  }, [projectId, storyId, currentPartId, loadCurrentPartDoc]);

  // Sync currentPartDoc from store to parent onChange (which flows to editor)
  useEffect(() => {
    if (currentPartDoc) {
      onChange(currentPartDoc);
    }
  }, [currentPartDoc, onChange]);

  const toolbar = createToolbarFromConfig(editorConfig, editor);

  // Chat configuration
  const chatConfig = {
    kind: 'prose' as const,
    storyId,
    storyTitle: title,
    projectId,
  };

  const { handleNavigate, handleOpenWizard } = useEditorChat({
    chatConfig,
    editor: editor ?? undefined,
  });

  // Extract full text markdown when editor content changes
  useEffect(() => {
    if (!editor) return;

    const updateMarkdown = () => {
      try {
        const json = editor.getJSON();
        const markdown = jsonToMarkdown(json, 'prose');
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
  }, [editor]);

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
          const markdown = jsonToMarkdown({ type: 'doc', content: selectedContent }, 'prose');
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
  }, [editor]);

  // Chapter navigation handlers
  const handleEnableParts = async () => {
    try {
      await enableParts(projectId, storyId);
    } catch (error) {
      console.error('Failed to enable parts:', error);
    }
  };

  const handlePreviousPart = async () => {
    if (currentPartIndex > 0) {
      const previousPart = parts[currentPartIndex - 1];
      setCurrentPartId(previousPart.id);
      await loadCurrentPartDoc(projectId, storyId, previousPart.id);
    }
  };

  const handleNextPart = async () => {
    if (currentPartIndex < totalParts - 1) {
      const nextPart = parts[currentPartIndex + 1];
      setCurrentPartId(nextPart.id);
      await loadCurrentPartDoc(projectId, storyId, nextPart.id);
    }
  };

  const handleOpenOverview = () => {
    setSubview('chapters');
  };

  const handleCreatePart = async () => {
    // Don't check currentStoryMetadata - the store action will reload it
    // Just use the current parts array from the store
    try {
      // Determine order for new part (after current part)
      const newOrder = currentPartIndex >= 0 ? currentPartIndex + 1 : parts.length;

      // Create the new part
      const createPart = useAppStore.getState().createPart;
      const newPartId = await createPart(projectId, storyId, newOrder);

      // Switch to the new part
      setCurrentPartId(newPartId);
    } catch (error) {
      console.error('Failed to create part:', error);
    }
  };

  const chapterNavButtons = useChapterNavigationButtons({
    partsEnabled,
    currentPartIndex,
    totalParts,
    onPreviousPart: handlePreviousPart,
    onNextPart: handleNextPart,
    canGoPrevious: true,
    canGoNext: true,
    onOpenOverview: handleOpenOverview,
  });

  // Build menu items for the story menu
  const menuItems: TopNavigationMenuItem[] = [];
  if (!partsEnabled) {
    menuItems.push({
      label: 'Enable Chapters',
      onClick: handleEnableParts,
      icon: 'parts',
    });
  }
  if (partsEnabled) {
    menuItems.push({
      label: 'Add chapter',
      onClick: handleCreatePart,
      icon: 'add',
    });
  }
  // Future: Add more menu items here (story settings, export, etc.)

  if (!editor) return null;

  // Show chapters overview subview
  if (subview === 'chapters') {
    return (
      <StorySectionShell
        projectId={projectId}
        storyId={storyId}
        preloadMetaKeys={['brief', 'outline']}
      >
        <ChapterOverview
          projectId={projectId}
          storyId={storyId}
          currentStoryTitle={title}
          onNavigateToEditor={() => setSubview('editor')}
        />
      </StorySectionShell>
    );
  }

  // Show main editor subview
  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={['brief', 'outline']}
    >
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
        <Box py={20} px={30} className={styles.topNavigation}>
          <TopNavigation
            title={partsEnabled ? partTitle : title}
            menuItems={menuItems}
          />
        </Box>
        <Box py={20} px={30} className={styles.bottomNavigation}>
          <TopNavigation
            buttons={chapterNavButtons}
          />
        </Box>
        <Box
          className={styles.topOverlay}
          style={{
            opacity: isScrolled ? 1 : 0,
          }}
        />

        <ScrollArea
          className={styles.scrollAreaWrapper}
          type="hover"
          scrollbarSize={10}
          styles={{
            thumb: {
              zIndex: 20, // Above topOverlay
            }
          }}
          onScrollPositionChange={({ y }) => {
            setIsScrolled(y > 0);
          }}
        >
          <Box className={styles.editor}>
            <EditorContent editor={editor} />
          </Box>
        </ScrollArea>

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
      </Box>
    </StorySectionShell>
  );
};