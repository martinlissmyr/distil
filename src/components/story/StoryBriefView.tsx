// src/components/stories/StoryBriefView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { StorySectionShell } from './StorySectionShell';
import { useNavigation } from '../../hooks/useNavigation';
import type { MetaScope } from '../../types/metaDoc';

type StoryBriefViewProps = {
  projectId: string;
  storyId: string;
};

export const StoryBriefView: React.FC<StoryBriefViewProps> = ({
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

  const scope: MetaScope = {
    scope: 'story',
    projectId,
    storyId,
  };
  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={['brief']}
    >
      <MetaTextEditor
        mode="bound"
        scope={scope}
        metaKey="brief"
        title="Story brief"
        placeholder="Capture the core idea of this story…"
        withChat
        chatConfig={{
          kind: 'brief',
          storyId,
          projectId,
          onNavigate: handleNavigate,
        }}
      />
    </StorySectionShell>
  );
};