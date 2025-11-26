// src/components/layout/AlineaChrome.tsx
import React from 'react';
import { Box } from '@mantine/core';

export const AlineaChrome: React.FC = () => {
  return (
    <Box
      style={{
        height: '100%',            // fills the header (24px)
        width: '100%',
        paddingLeft: 72,           // space for traffic lights
        paddingRight: 16,
        display: 'flex',
        alignItems: 'center',
        WebkitAppRegion: 'drag',   // draggable area
        backgroundColor: 'transparent',
      }}
    >
    </Box>
  );
};