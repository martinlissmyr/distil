import React from 'react';
import type { StoryMeta } from '../../api/alineaClient';
import { EntityGrid } from '../common/EntityGrid';
import { FileText } from 'lucide-react';

type StoriesViewProps = {
  stories: StoryMeta[];
  currentProject: string;
  onSelectStory: (id: string) => void;
  onCreateStory: () => void;
  onEditStory: (id: string) => void;   // hook up later to a story modal
};

export const StoriesView: React.FC<StoriesViewProps> = ({
  stories,
  currentProject,
  onSelectStory,
  onCreateStory,
  onEditStory,
}) => {
  console.log(currentProject);
  return (
    <EntityGrid
      items={stories}
      getId={(s) => s.id}
      getLabel={(s) => s.title}
      onSelect={onSelectStory}
      onEdit={onEditStory}
      onCreate={onCreateStory}
      Icon={FileText}
      title={currentProject.name}
    />
  );
};