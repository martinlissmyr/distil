// src/ui/manifest/ManifestView.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { MetaTextEditor } from '../editor/MetaTextEditor';

export const ManifestView: React.FC = () => {
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
        scope={{ scope: 'root' }}
        metaKey="manifest"
        title="Author Manifest"
        placeholder="Start typing…"
        withChat
        chatConfig={{ kind: 'manifest' }}
      />
    </Box>
  );
};