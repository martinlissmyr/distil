// src/ui/stories/StoryWorldView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { useEditorChat } from '../../hooks/useEditorChat';
import { usePreloadMetaDocs } from '../../hooks/usePreloadMetaDocs';

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
  const { handleNavigate } = useEditorChat({
    chatConfig: {
      kind: 'world',
      storyId,
      projectId,
    },
  });

  // Preload context docs
  usePreloadMetaDocs(
    { scope: 'story', projectId, storyId },
    ['world', 'brief', 'outline']
  );

  return (
    <MetaTextEditor
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
  );
};
