// src/components/stories/StoryTextView.tsx
import React from 'react';
import { ProseEditor, ProseDoc } from '../editor/ProseEditor';
import { StorySectionShell } from './StorySectionShell';
import { useNavigation } from '../../hooks/useNavigation';

type StoryTextViewProps = {
  projectId: string;
  storyId: string;
  doc: ProseDoc;
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
      preloadMetaKeys={['brief', 'outline']}
    >
      <ProseEditor
        key={storyId}
        doc={doc}
        onChange={onChange}
        title={title}
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