// src/components/stories/StoryWorldView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { StorySectionShell } from './StorySectionShell';
import { useNavigation } from '../../hooks/useNavigation';

type StoryWorldViewProps = {
  projectId: string;
  storyId: string;
  title: string;
};

export const StoryWorldView: React.FC<StoryWorldViewProps> = ({
  projectId,
  storyId,
  title,
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
      preloadMetaKeys={['world', 'brief', 'outline']}
    >
      <MetaTextEditor
        mode="bound"
        scope={{ scope: 'story', projectId, storyId }}
        metaKey="world"
        title={title}
        placeholder="Describe the world of your story: time period, location, world-building details, rules of the world…"
        withChat
        chatConfig={{
          kind: 'world',
          storyId,
          projectId,
          onNavigate: handleNavigate,
        }}
      />
    </StorySectionShell>
  );
};
