// src/ui/story/StoryTextView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';
import { WritingEnvironment } from '../../editor/WritingEnvironment';
import { usePreloadMetaDocs } from '../../../hooks/usePreloadMetaDocs';
import { TopNavigation, type TopNavigationMenuItem } from '../../common/TopNavigation';
import { ChapterOverview } from './ChapterOverview';
import { useAppStore } from '../../../state/useAppStore';
import { useNavigation } from '../../../hooks/useNavigation';
import { StoryPreview } from './StoryPreview';
import { MultiChapterEditor } from './MultiChapterEditor';

type StoryTextViewProps = {
  projectId: string;
  storyId: string;
  doc: JSONContent | null;
  onChange: (doc: JSONContent) => void;
  title: string;
};

type Subview = 'editor' | 'chapters' | 'storyPreview';

export const ProseEditor: React.FC<StoryTextViewProps> = ({
  projectId,
  storyId,
  doc,
  onChange,
  title,
}) => {
  const storyKey = `${projectId}:${storyId}`;
  const [subviewState, setSubviewState] = useState<{ storyKey: string; view: Subview }>({
    storyKey,
    view: 'editor',
  });
  const [partToFocus, setPartToFocus] = useState<string | null>(null);
  const subview = subviewState.storyKey === storyKey ? subviewState.view : 'editor';

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
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run this logic once on mount, not on subsequent part changes
    if (hasLoadedRef.current === storyKey) return;
    hasLoadedRef.current = storyKey;

    if (!currentStoryMetadata || currentStoryMetadata.id !== storyId) {
      //console.log('[STORYVIEW] Metadata not loaded for story', storyId, ', calling loadStoryForView');
      void useAppStore.getState().loadStoryForView(projectId, storyId);
    } else if (currentPartId && !currentPartDoc) {
      // Metadata already loaded, but ensure part doc is loaded for current part
      // This prevents showing stale content when navigating back to a story
      //console.log('[STORYVIEW] Metadata already loaded, ensuring part doc loaded for:', currentPartId);
      void useAppStore.getState().loadCurrentPartDoc(projectId, storyId, currentPartId);
    }
  }, [projectId, storyId, storyKey, currentStoryMetadata, currentPartId, currentPartDoc]);

  // Reset the ref when story changes
  useEffect(() => {
    hasLoadedRef.current = null;
  }, [projectId, storyId]);

  const partsEnabled = currentStoryMetadata?.partsEnabled ?? false;
  const parts = currentStoryMetadata?.parts ?? [];
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
  const handleUpdate = useCallback((nextDoc: JSONContent) => {
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

  // Chapter navigation handlers
  const handleEnableParts = async () => {
    try {
      await enableParts(projectId, storyId);
    } catch (error) {
      console.error('Failed to enable parts:', error);
    }
  };

  const handleOpenChaptersOverview = () => {
    setSubviewState({ storyKey, view: 'chapters' });
  };

  const handleOpenStoryPreview = () => {
    setSubviewState({ storyKey, view: 'storyPreview' });
  };

  const handleCreatePart = async () => {
    // Don't check currentStoryMetadata - the store action will reload it
    // Just use the current parts array from the store
    try {
      // New chapters are appended until inline chapter controls are introduced.
      const newOrder = parts.length;
      const createPart = useAppStore.getState().createPart;
      const newPartId = await createPart(projectId, storyId, newOrder);
      setCurrentPartId(storyId, newPartId);
      setPartToFocus(newPartId);
    } catch (error) {
      console.error('Failed to create part:', error);
    }
  };

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
    ['brief', 'outline', 'style']
  );

  // Don't render editor until part data is synced
  const storyMetadataMissing = !currentStoryMetadata || currentStoryMetadata.id !== storyId;
  const currentPartDocMissing = !partsEnabled && !!currentPartId && !currentPartDoc;
  if (storyMetadataMissing || currentPartDocMissing) return null;

  // Show story preview subview
  if (subview === 'storyPreview') {
    return (
      <StoryPreview
        projectId={projectId}
        storyId={storyId}
        currentStoryTitle={title}
        onNavigateToEditor={() => setSubviewState({ storyKey, view: 'editor' })}
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
        onNavigateToEditor={(partId) => {
          if (partId) setPartToFocus(partId);
          setSubviewState({ storyKey, view: 'editor' });
        }}
      />
    );
  }

  if (partsEnabled) {
    return (
      <MultiChapterEditor
        key={storyKey}
        projectId={projectId}
        storyId={storyId}
        storyTitle={title}
        parts={parts}
        menuItems={menuItems}
        chatConfig={chatConfig}
        focusPartId={partToFocus ?? undefined}
        onFocusPartComplete={() => setPartToFocus(null)}
      />
    );
  }

  // Show main editor subview
  return (
      <WritingEnvironment
        docKind="prose"
        content={doc ?? undefined}
        onUpdate={handleUpdate}
        onSave={handleSave}
        autosaveDelay={1000}
        title={title}
        placeholder="Start writing your story..."
        chatConfig={chatConfig}
        navigation={
          <TopNavigation
            title={title}
            menuItems={menuItems}
          />
        }
      />
  );
};
