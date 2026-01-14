// src/ui/story/StoryTextView.tsx
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Box } from '@mantine/core';
import { WritingEnvironment } from '../editor/WritingEnvironment';
import { usePreloadMetaDocs } from '../../hooks/usePreloadMetaDocs';
import { TopNavigation, type TopNavigationMenuItem } from '../common/TopNavigation';
import { useChapterNavigationButtons } from './ChapterNavigation';
import { ChapterOverview } from './ChapterOverview';
import { useAppStore } from '../../state/useAppStore';
import { useNavigation } from '../../hooks/useNavigation';
import { getNextPart, getPreviousPart } from '../../models/story';
import { PartPreview } from './PartPreview';
import { StoryPreview } from './StoryPreview';

type StoryTextViewProps = {
  projectId: string;
  storyId: string;
  doc: any;
  onChange: (doc: any) => void;
  title: string;
};

type Subview = 'editor' | 'chapters' | 'storyPreview';

export const StoryTextView: React.FC<StoryTextViewProps> = ({
  projectId,
  storyId,
  doc,
  onChange,
  title,
}) => {
  const [subview, setSubview] = useState<Subview>('editor');

  // Refs for part preview scroll anchoring
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const previousPreviewRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Get parts state from app store
  const currentStoryMetadata = useAppStore((state) => state.currentStoryMetadata);
  const getCurrentPartId = useAppStore((state) => state.getCurrentPartId);
  const currentPartId = getCurrentPartId(storyId);
  const currentPartDoc = useAppStore((state) => state.currentPartDoc);
  const setCurrentPartId = useAppStore((state) => state.setCurrentPartId);
  const loadCurrentPartDoc = useAppStore((state) => state.loadCurrentPartDoc);
  const enableParts = useAppStore((state) => state.enableParts);

  // Get navigation store setter for persistence
  const { setCurrentPartId: setNavCurrentPartId } = useNavigation();

  // Load story metadata on mount (only if not already loaded)
  const [isLoading, setIsLoading] = React.useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only run this logic once on mount, not on subsequent part changes
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (!currentStoryMetadata || currentStoryMetadata.id !== storyId) {
      //console.log('[STORYVIEW] Metadata not loaded for story', storyId, ', calling loadStoryForView');
      setIsLoading(true);
      void useAppStore.getState().loadStoryForView(projectId, storyId).finally(() => {
        setIsLoading(false);
      });
    } else if (currentPartId && !currentPartDoc) {
      // Metadata already loaded, but ensure part doc is loaded for current part
      // This prevents showing stale content when navigating back to a story
      //console.log('[STORYVIEW] Metadata already loaded, ensuring part doc loaded for:', currentPartId);
      setIsLoading(true);
      void useAppStore.getState().loadCurrentPartDoc(projectId, storyId, currentPartId).finally(() => {
        setIsLoading(false);
      });
    }
  }, [projectId, storyId, currentStoryMetadata, currentPartId]);

  // Reset the ref when story changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [projectId, storyId]);

  // Reset subview to editor when navigation changes (e.g., returning from chapters view)
  useEffect(() => {
    setSubview('editor');
  }, [projectId, storyId]);

  const partsEnabled = currentStoryMetadata?.partsEnabled ?? false;
  const parts = currentStoryMetadata?.parts ?? [];
  const currentPartIndex = parts.findIndex((p) => p.id === currentPartId);
  const totalParts = parts.length;
  const partTitle = 'Chapter ' + (currentPartIndex + 1);

  // Compute previous/next parts for preview
  const previousPart = currentPartId ? getPreviousPart(parts, currentPartId) : null;
  const nextPart = currentPartId ? getNextPart(parts, currentPartId) : null;

  const showPreviousPreview = partsEnabled && previousPart?.projection?.summary;
  const showNextPreview = partsEnabled && nextPart?.projection?.summary;

  // Load part document when currentPartId changes and sync to navigation store
  useEffect(() => {
    if (!currentPartId) return;

    //console.log('[STORYVIEW] currentPartId changed to:', currentPartId);
    // Sync to navigation store for persistence
    setNavCurrentPartId(storyId, currentPartId);

    void loadCurrentPartDoc(projectId, storyId, currentPartId);
  }, [projectId, storyId, currentPartId, loadCurrentPartDoc, setNavCurrentPartId]);

  // Note: We do NOT sync currentPartDoc from store back to parent onChange.
  // The editor content flows correctly via the `doc` prop from parent.
  // Syncing store → parent would create circular data flow and overwrite correct content with stale data.

  // Update and save handlers - memoized to prevent unnecessary re-renders
  const handleUpdate = useCallback((nextDoc: any) => {
    onChange(nextDoc);
  }, [onChange]);

  const handleSave = useCallback(() => {
    // Story documents are saved via the onChange handler
    // The autosave mechanism will trigger this periodically
  }, []);

  // Chat configuration
  const chatConfig = {
    kind: 'prose' as const,
    storyId,
    storyTitle: title,
    projectId,
  };

  // Reset scroll flag when part changes, switching to editor subview, or loading completes
  useEffect(() => {
    if (subview === 'editor' || !isLoading) {
      hasScrolledRef.current = false;
    }
  }, [currentPartId, subview, isLoading]);

  // Scroll anchor effect: hide previous chapter preview on mount
  useLayoutEffect(() => {
    if (!showPreviousPreview || hasScrolledRef.current || isLoading) return;

    const viewport = scrollViewportRef.current;
    const preview = previousPreviewRef.current;

    if (!viewport || !preview) {
      return;
    }

    // Measure preview height
    const previewHeight = preview.getBoundingClientRect().height;

    // Use requestAnimationFrame to ensure scroll happens after all layout operations
    requestAnimationFrame(() => {
      viewport.scrollTop = previewHeight;
      hasScrolledRef.current = true;
    });
  }, [showPreviousPreview, currentPartId, subview, isLoading]);

  // Monitor scroll position and re-apply anchor if it gets reset
  useEffect(() => {
    if (!showPreviousPreview || !scrollViewportRef.current || !previousPreviewRef.current) return;

    const viewport = scrollViewportRef.current;
    const preview = previousPreviewRef.current;

    // Set up a check interval
    const checkInterval = setInterval(() => {
      // If scroll position is at top but we should be scrolled down, re-apply
      if (viewport.scrollTop === 0 && hasScrolledRef.current) {
        const previewHeight = preview.getBoundingClientRect().height;
        if (previewHeight > 0) {
          viewport.scrollTop = previewHeight;
        }
      }
    }, 50); // Check every 50ms

    // Clear interval after 2 seconds (enough time for all async operations)
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 2000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [showPreviousPreview, currentPartId, subview, isLoading]);

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
      setCurrentPartId(storyId, previousPart.id);
      await loadCurrentPartDoc(projectId, storyId, previousPart.id);
    }
  };

  const handleNextPart = async () => {
    if (currentPartIndex < totalParts - 1) {
      const nextPart = parts[currentPartIndex + 1];
      setCurrentPartId(storyId, nextPart.id);
      await loadCurrentPartDoc(projectId, storyId, nextPart.id);
    }
  };

  const handleOpenChaptersOverview = () => {
    setSubview('chapters');
  };

  const handleOpenStoryPreview = () => {
    setSubview('storyPreview');
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
      setCurrentPartId(storyId, newPartId);
    } catch (error) {
      console.error('Failed to create part:', error);
    }
  };

  const handleClickPreviousPreview = () => {
    if (previousPart) {
      setCurrentPartId(storyId, previousPart.id);
      void loadCurrentPartDoc(projectId, storyId, previousPart.id);
    }
  };

  const handleClickNextPreview = () => {
    if (nextPart) {
      setCurrentPartId(storyId, nextPart.id);
      void loadCurrentPartDoc(projectId, storyId, nextPart.id);
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
    onOpenOverview: handleOpenChaptersOverview,
  });

  // Build menu items for the story menu
  const menuItems: TopNavigationMenuItem[] = [];
  if (partsEnabled) {
    menuItems.push({
      label: 'Add chapter',
      onClick: handleCreatePart,
      icon: 'add',
    });
    menuItems.push({
      type: 'divider',
    });
    menuItems.push({
      label: 'Chapters Overview',
      onClick: handleOpenChaptersOverview,
      icon: 'parts',
    });
  }
  menuItems.push({
    label: 'Reading Mode',
    onClick: handleOpenStoryPreview,
    icon: 'readingMode',
  });
  if (!partsEnabled) {
    menuItems.push({
      type: 'divider',
    });
    menuItems.push({
      label: 'Enable Chapters',
      onClick: handleEnableParts,
      icon: 'parts',
    });
  }

  // Future: Add more menu items here (story settings, export, etc.)

  // Preload context docs
  usePreloadMetaDocs(
    { scope: 'story', projectId, storyId },
    ['brief', 'outline']
  );

  // Don't render editor until part data is synced
  if (isLoading) return null;

  // Show story preview subview
  if (subview === 'storyPreview') {
    return (
      <StoryPreview
        projectId={projectId}
        storyId={storyId}
        currentStoryTitle={title}
        onNavigateToEditor={() => setSubview('editor')}
      />
    );
  }

  // Show chapters overview subview
  if (subview === 'chapters') {
    return (
      <ChapterOverview
        projectId={projectId}
        storyId={storyId}
        currentStoryTitle={title}
        onNavigateToEditor={() => setSubview('editor')}
      />
    );
  }

  // Show main editor subview
  return (
      <WritingEnvironment
        docKind="prose"
        content={doc}
        onUpdate={handleUpdate}
        onSave={handleSave}
        autosaveDelay={1000}
        title={partsEnabled ? partTitle : title}
        placeholder="Start writing your story..."
        chatConfig={chatConfig}
        navigation={
          <TopNavigation
            title={partsEnabled ? partTitle : title}
            menuItems={menuItems}
          />
        }
        bottomNavigation={
          <TopNavigation
            title=""
            buttons={chapterNavButtons}
          />
        }
        scrollViewportRef={scrollViewportRef}
        renderEditorContent={(editorContent) => (
          <>
            {showPreviousPreview && (
              <Box ref={previousPreviewRef}>
                <PartPreview
                  summary={previousPart!.projection!.summary}
                  position="previous"
                  onClick={handleClickPreviousPreview}
                />
              </Box>
            )}

            {editorContent}

            {showNextPreview && (
              <PartPreview
                summary={nextPart!.projection!.summary}
                position="next"
                onClick={handleClickNextPreview}
              />
            )}
          </>
        )}
      />
  );
};