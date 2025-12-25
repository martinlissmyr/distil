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
  const { setStorySection, goToManifest } = useNavigation();

  const handleNavigate = (target: string) => {
    if (target === 'manifest') {
      goToManifest();
    } else {
      setStorySection(target as any);
    }
  };

  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={['outline', 'brief']}
    >
      <MetaTextEditor
        mode="bound"
        scope={{ scope: 'story', projectId, storyId }}
        metaKey="outline"
        title="Story outline"
        placeholder="Sketch the structure of your story…"
        withChat
        chatConfig={{
          kind: 'outline',
          storyId,
          projectId,
          onNavigate: handleNavigate,
        }}
      />
    </StorySectionShell>
  );
};