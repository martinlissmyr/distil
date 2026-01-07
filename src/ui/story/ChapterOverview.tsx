// src/ui/story/ChapterOverview.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Box } from '@mantine/core';
import { useAppStore } from '../../state/useAppStore';
import { EntityGrid } from '../common/EntityGrid';
import { TopNavigation } from '../common/TopNavigation';
import { projectionService } from '../../services/ProjectionGenerationService';
import styles from './EntityIndexView.module.scss';

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

  // Transform parts to grid items
  const gridItems: ChapterGridItem[] = useMemo(() => {
    return parts.map((part) => ({
      id: part.id,
      name: `Chapter ${part.order + 1}`,
      order: part.order,
      text: part.projection?.summary,
      comment: part.comment || '',
    }));
  }, [parts]);

  // Navigate to part
  const handleEdit = async (partId: string) => {
    setCurrentPartId(partId);
    await loadCurrentPartDoc(projectId, storyId, partId);
    onNavigateToEditor();
  };

  // Create new part
  const handleCreate = async () => {
    try {
      const newOrder = parts.length;
      const newPartId = await createPart(projectId, storyId, newOrder);
      setCurrentPartId(newPartId);
      // createPart already loads the doc, so we can navigate directly
      //onNavigateToEditor();
    } catch (error) {
      console.error('Failed to create part:', error);
    }
  };

  // Delete part with confirmation
  const handleDelete = async (partId: string) => {
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
  };

  // Reorder parts
  const handleReorder = async (reorderedIds: string[]) => {
    try {
      await reorderParts(projectId, storyId, reorderedIds);
    } catch (error) {
      console.error('Failed to reorder parts:', error);
    }
  };

  // Update part comment
  const handleCommentChange = async (partId: string, newComment: string) => {
    try {
      await updatePartComment(projectId, storyId, partId, newComment);
    } catch (error) {
      console.error('Failed to update part comment:', error);
    }
  };

  // Back to prose editor
  const handleBack = () => {
    onNavigateToEditor();
  };

  const [organise, setOrganise] = useState(false);
  const buttons = [
    {
      label: organise ? 'View' : 'Organise',
      onClick: () => setOrganise(!organise),
    },
    {
      icon: 'add',
      label: 'Add chapter',
      iconOnly: true,
      onClick: () => handleCreate(),
    },
  ];

  // Get current part ID from store
  const currentPartId = useAppStore((state) => state.currentPartId);

  // Generate projection for current part when opening chapter overview
  useEffect(() => {
    if (currentPartId && projectId && storyId) {
      console.log(`[ChapterOverview] Triggering projection generation for current part ${currentPartId}`);
      projectionService.generateForPart(projectId, storyId, currentPartId);
    }
  }, []); // Only run on mount

  return (
    <Box className={styles.root}>
      <Box py={20} px={30}>
        <TopNavigation
          title={`${currentStoryTitle} – Chapters`}
          onBack={handleBack}
          buttons={buttons}
          buttonsLayout='separate'
        />
      </Box>
      <Box p="xl">
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
