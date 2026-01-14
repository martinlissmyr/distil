// src/ui/stories/StoryBriefView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { useEditorChat } from '../../hooks/useEditorChat';
import { usePreloadMetaDocs } from '../../hooks/usePreloadMetaDocs';
import type { MetaScope } from '../../types/metaDoc';

type StoryBriefViewProps = {
  projectId: string;
  storyId: string;
  title: string;
};

export const StoryBriefView: React.FC<StoryBriefViewProps> = ({
  projectId,
  storyId,
  title,
}) => {
  const { handleNavigate } = useEditorChat({
    chatConfig: {
      kind: 'brief',
      storyId,
      projectId,
    },
  });

  const scope: MetaScope = {
    scope: 'story',
    projectId,
    storyId,
  };

  // Preload context docs
  usePreloadMetaDocs(scope, ['brief']);

  return (
    <MetaTextEditor
      scope={scope}
      metaKey="brief"
      title={title}
      placeholder="Capture the core idea of this story…"
      withChat
      chatConfig={{
        kind: 'brief',
        storyId,
        projectId,
        onNavigate: handleNavigate,
      }}
    />
  );
};