// src/ui/common/LoadingSplash.tsx
import React from 'react';
import { Box, Loader, Text } from '@mantine/core';

/**
 * Full-screen loading splash shown during app initialization
 */
export const LoadingSplash: React.FC = () => {
  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Loader size="lg" />
      <Text size="sm" c="dimmed">Loading Distil...</Text>
    </Box>
  );
};
