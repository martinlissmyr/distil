import React from 'react';
import { Box } from '@mantine/core';
import type { StoryMeta } from '../../api/client';
import { EntityGrid } from '../common/EntityGrid';
import { TopNavigation } from '../common/TopNavigation';

type StoriesViewProps = {
  stories: StoryMeta[];
  currentProject: { id: string; name: string } | undefined;
  onSelectStory: (id: string) => void;
  onCreateStory: () => void;
  onEditStory: (id: string) => void;
  onReorderStories: (ids: string[]) => void;
};

export const StoriesView: React.FC<StoriesViewProps> = ({
  stories,
  currentProject,
  onSelectStory,
  onCreateStory,
  onEditStory,
  onReorderStories
}) => {
  return (
    <Box>
      <Box py={20} px={30}>
        <TopNavigation
          title={currentProject?.name || 'Untitled Project'}
        />
      </Box>

      <EntityGrid
        items={stories}
        getId={(s) => s.id}
        getLabel={(s) => s.title}
        onSelect={onSelectStory}
        onEdit={onEditStory}
        onCreate={onCreateStory}
        icon="story"
        title={currentProject?.name}
        onReorderEntities={onReorderStories}
      />
    </Box>
  );
};