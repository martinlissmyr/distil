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
        mode="bound"
        scope={{ kind: 'root' }}
        metaKey="manifest"
        title="Author Manifest"
        placeholder="Start typing…"
        withChat
        chatConfig={{ kind: 'manifest' }}
      />
    </Box>
  );
};