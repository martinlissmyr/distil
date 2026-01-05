// src/ui/layout/AppLayout.tsx
import React from 'react';
import { AppShell, Box } from '@mantine/core';

type AppLayoutProps = {
  sidebar: React.ReactNode;
  main: React.ReactNode;
};

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, main }) => {
  const NAV_WIDTH = 240;
  const HEADER_HEIGHT = 24; // visual height of the draggable chrome

  return (
    <AppShell
      // Tell Mantine the header takes no layout space
      header={{ height: 0, collapsed: false }}
      navbar={{
        width: NAV_WIDTH,
        breakpoint: 'sm',
        collapsed: { mobile: false, desktop: false },
      }}
      padding={0}
      styles={{
        root: {
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
        header: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
          background: 'transparent',
          borderBottom: 'none',
          boxShadow: 'none',
          zIndex: 100,
          pointerEvents: 'none', // so content below is clickable, except where we re-enable it
        },
        navbar: {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxSizing: 'border-box',
          paddingTop: HEADER_HEIGHT + 10,
          background: 'var(--bg-sidebar)',
          color: 'var(--text)',
          borderRight: '1px solid var(--border-subtlest)',
        },
        main: {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxSizing: 'border-box',
          borderTop: 'none',
          overflow: 'auto',
        },
      }}
    >
      {/* draggable chrome overlay */}
      <AppShell.Header withBorder={false}>
        <Box
          style={{
            height: HEADER_HEIGHT,
            width: '100%',
            paddingLeft: 72, // space for traffic lights
            paddingRight: 16,
            display: 'flex',
            alignItems: 'center',
            WebkitAppRegion: 'drag', // draggable area
            backgroundColor: 'transparent',
            pointerEvents: 'auto', // re-enable inside this strip so dragging works
          }}
        />
      </AppShell.Header>

      <AppShell.Navbar withBorder={false}>{sidebar}</AppShell.Navbar>

      <AppShell.Main>{main}</AppShell.Main>
    </AppShell>
  );
};
