import React, { useState } from 'react';
import { Box } from '@mantine/core';
import type { StoryMeta } from '../../api/client';
import { EntityGrid } from '../common/EntityGrid';
import { TopNavigation } from '../common/TopNavigation';
import { ProjectPreview } from '../documents/prose/ProjectPreview';

type StoriesViewProps = {
  stories: StoryMeta[];
  projectId: string;
  currentProject: { id: string; name: string } | undefined;
  onSelectStory: (id: string) => void;
  onCreateStory: () => void;
  onEditStory: (id: string) => void;
  onReorderStories: (ids: string[]) => void;
};

export const StoriesView: React.FC<StoriesViewProps> = ({
  stories,
  projectId,
  currentProject,
  onSelectStory,
  onCreateStory,
  onEditStory,
  onReorderStories
}) => {
  const [isReadingModeOpen, setIsReadingModeOpen] = useState(false);
  const projectTitle = currentProject?.name || 'Untitled Project';

  if (isReadingModeOpen) {
    return (
      <ProjectPreview
        projectId={projectId}
        projectTitle={projectTitle}
        stories={stories}
        onBack={() => setIsReadingModeOpen(false)}
      />
    );
  }

  return (
    <Box>
      <Box py={20} px={30}>
        <TopNavigation
          title={projectTitle}
          menuItems={[{
            label: 'Reading Mode',
            onClick: () => setIsReadingModeOpen(true),
            icon: 'readingMode',
          }]}
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
