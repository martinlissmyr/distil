// src/components/manifest/ManifestView.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { MetaTextEditor, MetaDoc } from '../editor/MetaTextEditor';

type ManifestViewProps = {
  doc: MetaDoc | null;
  onChange: (doc: MetaDoc) => void;
};

export const ManifestView: React.FC<ManifestViewProps> = ({ doc, onChange }) => {
  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MetaTextEditor
        title="Author Manifest"
        doc={doc}
        onChange={onChange}
        placeholder="Start typing…"
        withChat
        chatConfig={{
          kind: 'manifest',
          initialMessage: '👋 The manifest is where you, as an author, describe your tone of voice, your values, and the principles you adhere to. Make it well structured and concise.',
        }}
      />
    </Box>
  );
};