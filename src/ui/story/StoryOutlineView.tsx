// src/ui/stories/StoryOutlineView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { useEditorChat } from '../../hooks/useEditorChat';
import { usePreloadMetaDocs } from '../../hooks/usePreloadMetaDocs';

type StoryOutlineViewProps = {
  projectId: string;
  storyId: string;
  title: string;
};

export const StoryOutlineView: React.FC<StoryOutlineViewProps> = ({
  projectId,
  storyId,
  title,
}) => {
  const { handleNavigate } = useEditorChat({
    chatConfig: {
      kind: 'outline',
      storyId,
      projectId,
    },
  });

  // Preload context docs
  usePreloadMetaDocs(
    { scope: 'story', projectId, storyId },
    ['outline', 'brief']
  );

  return (
    <MetaTextEditor
      scope={{ scope: 'story', projectId, storyId }}
      metaKey="outline"
      title={title}
      placeholder="Sketch the structure of your story…"
      withChat
      chatConfig={{
        kind: 'outline',
        storyId,
        projectId,
        onNavigate: handleNavigate,
      }}
    />
  );
};