// src/ui/documents/meta/OutlineView.tsx
import React from 'react';
import { MetaTextEditor } from './MetaTextEditor';
import { useEditorChat } from '../../../hooks/useEditorChat';
import { usePreloadMetaDocs } from '../../../hooks/usePreloadMetaDocs';

type OutlineViewProps = {
  projectId: string;
  storyId: string;
  title: string;
};

export const OutlineView: React.FC<OutlineViewProps> = ({
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