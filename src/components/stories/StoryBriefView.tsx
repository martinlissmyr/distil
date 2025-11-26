// src/components/stories/StoryBriefView.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { MetaTextEditor, MetaDoc } from '../editor/MetaTextEditor';

type StoryBriefViewProps = {
  doc: MetaDoc | null;
  onChange: (doc: MetaDoc) => void;
};

export const StoryBriefView: React.FC<StoryBriefViewProps> = ({
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
        title="Story brief"
        doc={doc}
        onChange={onChange}
        placeholder="Capture the core idea of this story…"
        withChat
        chatConfig={{ 
          kind: 'brief',
          initialMessage: 'Describe the core idea, themes, and intended audience. This is the high-level pitch of the story.'
        }}
      />
    </Box>
  );
};