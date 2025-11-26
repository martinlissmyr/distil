// src/components/stories/StoryOutlineView.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { MetaTextEditor, MetaDoc } from '../editor/MetaTextEditor';

type StoryOutlineViewProps = {
  doc: MetaDoc | null;
  onChange: (doc: MetaDoc) => void;
};

export const StoryOutlineView: React.FC<StoryOutlineViewProps> = ({
  doc,
  onChange,
}) => {
  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MetaTextEditor
        title="Story outline"
        doc={doc}
        onChange={onChange}
        placeholder="Sketch the structure of your story…"
        withChat
        chatConfig={{ 
          kind: 'outline',
          initialMessage: 'Break the story into acts, chapters, or major beats. Focus on structure rather than detailed prose.',
        }}
      />
    </Box>
  );
};