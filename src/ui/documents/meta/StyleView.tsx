// src/ui/documents/meta/StyleView.tsx
import React from 'react';
import { MetaTextEditor } from './MetaTextEditor';
import { useEditorChat } from '../../../hooks/useEditorChat';
import { usePreloadMetaDocs } from '../../../hooks/usePreloadMetaDocs';

type StyleViewProps = {
  projectId: string;
  storyId: string;
  title: string;
};

export const StyleView: React.FC<StyleViewProps> = ({
  projectId,
  storyId,
  title,
}) => {
  const { handleNavigate } = useEditorChat({
    chatConfig: {
      kind: 'style',
      storyId,
      projectId,
    },
  });

  usePreloadMetaDocs(
    { scope: 'story', projectId, storyId },
    ['style', 'brief', 'outline', 'world']
  );

  return (
    <MetaTextEditor
      scope={{ scope: 'story', projectId, storyId }}
      metaKey="style"
      title={title}
      placeholder="Define the prose style for this story: narrative voice, point of view, tense, rhythm, register, dialogue style, imagery, and stylistic do/don't rules..."
      withChat
      chatConfig={{
        kind: 'style',
        storyId,
        projectId,
        onNavigate: handleNavigate,
      }}
    />
  );
};
