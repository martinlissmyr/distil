// src/ui/stories/StoryTextView.tsx
import React from 'react';
import { ProseEditor } from '../editor/ProseEditor';
import { StorySectionShell } from './StorySectionShell';
import { useEditorChat } from '../../hooks/useEditorChat';

type StoryTextViewProps = {
  projectId: string;
  storyId: string;
  doc: any;
  onChange: (id: string) => void;
  title: string;
};

export const StoryTextView: React.FC<StoryTextViewProps> = ({
  projectId,
  storyId,
  doc,
  onChange,
  title,
}) => {
  const { handleNavigate } = useEditorChat({
    chatConfig: {
      kind: 'prose',
      storyId,
      storyTitle: title,
      projectId,
    },
  });

  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={['brief', 'outline']}
    >
      <ProseEditor
        key={storyId}
        doc={doc}
        onChange={onChange}
        title={title}
        placeholder="Start writing your story..."
        withChat
        chatConfig={{
          kind: 'prose',
          storyId,
          storyTitle: title,
          projectId,
          onNavigate: handleNavigate,
        }}
      />
    </StorySectionShell>
  );
};