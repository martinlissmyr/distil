import React from 'react';
import type { StoryMeta } from '../../api/client';
import { EntityGrid } from '../common/EntityGrid';

type StoriesViewProps = {
  stories: StoryMeta[];
  currentProject: string;
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
    <EntityGrid
      items={stories}
      getId={(s) => s.id}
      getLabel={(s) => s.title}
      onSelect={onSelectStory}
      onEdit={onEditStory}
      onCreate={onCreateStory}
      icon="story"
      title={currentProject.name}
      onReorderEntities={onReorderStories}
    />
  );
};