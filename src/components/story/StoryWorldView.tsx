// src/components/stories/StoryWorldView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { StorySectionShell } from './StorySectionShell';

type StoryWorldViewProps = {
  projectId: string;
  storyId: string;
};

export const StoryWorldView: React.FC<StoryWorldViewProps> = ({
  projectId,
  storyId,
}) => {
  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={['world']}
    >
      <MetaTextEditor
        mode="bound"
        scope={{ kind: 'story', projectId, storyId }}
        metaKey="world"
        title="Story world"
        placeholder="Describe the world of your story: time period, location, world-building details, rules of the world…"
        withChat
      />
    </StorySectionShell>
  );
};
