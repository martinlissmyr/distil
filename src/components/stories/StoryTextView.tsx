import React from 'react';
import { ProseEditor, ProseDoc } from '../editor/ProseEditor';
import { Box } from '@mantine/core';

type StoryTextViewProps = {
  storyId: string;
  doc: ProseDoc;
  onChange: (id: string) => void;
  title: string;
};

export const StoryTextView: React.FC<StoryTextViewProps> = ({
  storyId,
  doc,
  onChange,
  title,
}) => {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      <Box style={{ flex: 1, minHeight: 0 }}>
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
            initialMessage: "Hi! Ask me for help on anything regarding this text.",
          }}
        />
      </Box>
    </Box>
  );
};