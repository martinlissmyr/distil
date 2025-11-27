// src/components/stories/StoryOutlineView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { StorySectionShell } from './StorySectionShell';

type StoryOutlineViewProps = {
  projectId: string;
  storyId: string;
};

export const StoryOutlineView: React.FC<StoryOutlineViewProps> = ({
  projectId,
  storyId,
}) => {
  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={['outline']}
    >
      <MetaTextEditor
        mode="bound"
        scope={{ kind: 'story', projectId, storyId }}
        metaKey="outline"
        title="Story outline"
        placeholder="Sketch the structure of your story…"
        withChat
        chatConfig={{ kind: 'outline', storyId }}
      />
    </StorySectionShell>
  );
};