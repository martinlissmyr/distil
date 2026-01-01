// src/components/stories/StoryOutlineView.tsx
import React from 'react';
import { MetaTextEditor } from '../editor/MetaTextEditor';
import { StorySectionShell } from './StorySectionShell';
import { useEditorChat } from '../../hooks/useEditorChat';

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
    </StorySectionShell>
  );
};