// src/components/stories/StorySectionShell.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { usePreloadMetaDocs } from '../../hooks/usePreloadMetaDocs';
import type { MetaDocKey } from '../../types/metaDoc';

type StorySectionShellProps = {
  projectId: string;
  storyId: string;
  preloadMetaKeys?: MetaDocKey[]; // e.g. ['brief', 'outline']
  children: React.ReactNode;
};

export const StorySectionShell: React.FC<StorySectionShellProps> = ({
  projectId,
  storyId,
  preloadMetaKeys = [],
  children,
}) => {
  usePreloadMetaDocs(
    { scope: 'story', projectId, storyId },
    preloadMetaKeys
  );

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </Box>
  );
};