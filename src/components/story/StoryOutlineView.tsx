// src/components/stories/StoryOutlineView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { StorySectionShell } from './StorySectionShell';
import { useNavigation } from '../../hooks/useNavigation';

type StoryOutlineViewProps = {
  projectId: string;
  storyId: string;
};

export const StoryOutlineView: React.FC<StoryOutlineViewProps> = ({
  projectId,
  storyId,
}) => {
  const { setStorySection } = useNavigation();

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
        chatConfig={{
          kind: 'outline',
          storyId,
          projectId,
          onNavigate: (target) => setStorySection(target as any),
        }}
      />
    </StorySectionShell>
  );
};