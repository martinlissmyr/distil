// src/ui/story/ChapterOverview.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box } from '@mantine/core';
import { useAppStore } from '../../state/useAppStore';
import { EntityGrid } from '../common/EntityGrid';
import { TopNavigation } from '../common/TopNavigation';
import { projectionService } from '../../services/ProjectionGenerationService';
import type { PartIndexEntry } from '../../models/story';
import navigationStyles from './StoryNavigation.module.scss';
import {MIN_WORDS_FOR_PROJECTION_GENERATION, isProjectionStale} from '../../models/story';

type ChapterOverviewProps = {
  projectId: string;
  storyId: string;
  currentStoryTitle: string;
  onNavigateToEditor: () => void;
};

type ChapterGridItem = {
  id: string;
  name: string;
  order: number;
  text?: string;
  comment?: string;
};

export const ChapterOverview: React.FC<ChapterOverviewProps> = ({
  projectId,
  storyId,
  currentStoryTitle,
  onNavigateToEditor,
}) => {
  // Get parts data from store
  const currentStoryMetadata = useAppStore((state) => state.currentStoryMetadata);

  // Get store actions
  const getCurrentPartId = useAppStore((state) => state.getCurrentPartId);
  const setCurrentPartId = useAppStore((state) => state.setCurrentPartId);
  const loadCurrentPartDoc = useAppStore((state) => state.loadCurrentPartDoc);
  const createPart = useAppStore((state) => state.createPart);
  const deletePart = useAppStore((state) => state.deletePart);
  const reorderParts = useAppStore((state) => state.reorderParts);
  const updatePartComment = useAppStore((state) => state.updatePartComment);

  // Memoize parts array to prevent unnecessary recalculations
  const parts = useMemo(() => {
    return currentStoryMetadata?.parts || [];
  }, [currentStoryMetadata?.parts]);

  const getProjectionText = (part: PartIndexEntry) => {
    if ((part.wordCount ?? 0) < MIN_WORDS_FOR_PROJECTION_GENERATION) {
      return "Write a bit more, and I can summarize this.";
    }
    if (!part.projection) {
      return "I'm working on a summary.";
    }
    if (isProjectionStale(part)) {
      return "I'm updating the summary to reflect your latest changes.";
    }
    return part.projection?.summary;
  }

  // Transform parts to grid items
  const gridItems: ChapterGridItem[] = useMemo(() => {
    return parts.map((part) => ({
      id: part.id,
      name: `Chapter ${part.order + 1}`,
      order: part.order,
      text: getProjectionText(part),
      comment: part.comment || '',
    }));
  }, [parts]);

  // Navigate to part
  const handleEdit = useCallback(async (partId: string) => {
    setCurrentPartId(storyId, partId);
    await loadCurrentPartDoc(projectId, storyId, partId);
    onNavigateToEditor();
  }, [storyId, projectId, setCurrentPartId, loadCurrentPartDoc, onNavigateToEditor]);

  // Create new part
  const handleCreate = useCallback(async () => {
    try {
      const newOrder = parts.length;
      const newPartId = await createPart(projectId, storyId, newOrder);

      setCurrentPartId(storyId, newPartId);
      // createPart already loads the doc, so we can navigate directly
      onNavigateToEditor();
    } catch (error) {
      console.error('Failed to create part:', error);
    }
  }, [parts.length, createPart, projectId, storyId, setCurrentPartId, onNavigateToEditor]);

  // Delete part with confirmation
  const handleDelete = useCallback(async (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const chapterName = `Chapter ${part.order + 1}`;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${chapterName}? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deletePart(projectId, storyId, partId);
      } catch (error) {
        console.error('Failed to delete part:', error);
      }
    }
  }, [parts, deletePart, projectId, storyId]);

  // Reorder parts
  const handleReorder = useCallback(async (reorderedIds: string[]) => {
    try {
      await reorderParts(projectId, storyId, reorderedIds);
    } catch (error) {
      console.error('Failed to reorder parts:', error);
    }
  }, [reorderParts, projectId, storyId]);

  // Update part comment
  const handleCommentChange = useCallback(async (partId: string, newComment: string) => {
    try {
      await updatePartComment(projectId, storyId, partId, newComment);
    } catch (error) {
      console.error('Failed to update part comment:', error);
    }
  }, [updatePartComment, projectId, storyId]);

  // Back to prose editor
  const handleBack = useCallback(() => {
    onNavigateToEditor();
  }, [onNavigateToEditor]);

  const [organise, setOrganise] = useState(false);
  const buttons = useMemo(() => [
    {
      label: organise ? 'View' : 'Organise',
      onClick: () => setOrganise(!organise),
    },
    {
      icon: 'add' as const,
      label: 'Add chapter',
      iconOnly: true,
      onClick: handleCreate,
    },
  ], [organise, handleCreate]);

  // Get current part ID from store
  const currentPartId = getCurrentPartId(storyId);

  // Generate projection for current part when opening chapter overview
  useEffect(() => {
    if (currentPartId && projectId && storyId) {
      console.log(`[ChapterOverview] Triggering projection generation for current part ${currentPartId}`);
      projectionService.generateForPart(projectId, storyId, currentPartId);
    }
  }, []); // Only run on mount

  return (
    <Box>
      <Box className={navigationStyles.topNavigation}>
        <TopNavigation
          title={`${currentStoryTitle} – Chapters`}
          onBack={handleBack}
          buttons={buttons}
          buttonsLayout='separate'
        />
      </Box>
      <Box
        className={navigationStyles.topOverlay}
      />
      <Box p="xl" pt={80}>
        <EntityGrid<ChapterGridItem>
          items={gridItems}
          getId={(item) => item.id}
          getText={(item) => item.text || 'No content'}
          getComment={(item) => item.comment}
          getOrderNumber={(item) => item.order + 1}
          onSelect={handleEdit}
          onDelete={handleDelete}
          onCreate={handleCreate}
          onReorderEntities={handleReorder}
          onCommentChange={handleCommentChange}
          createLabel="New Chapter"
          mode="list"
          sorting={organise}
        />
      </Box>
    </Box>
  );
};
