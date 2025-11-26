// src/components/layout/AlineaLayout.tsx
import React from 'react';
import { AppShell } from '@mantine/core';
import { AlineaChrome } from './AlineaChrome';

type AlineaLayoutProps = {
  sidebar: React.ReactNode;
  main: React.ReactNode;
};

export const AlineaLayout: React.FC<AlineaLayoutProps> = ({
  sidebar,
  main,
}) => {
  const NAV_WIDTH = 240;
  const HEADER_HEIGHT = 24; // visual height of the draggable chrome

  return (
    <AppShell
      // Tell Mantine the header takes no layout space
      header={{ height: 0, collapsed: false }}
      navbar={{
        width: NAV_WIDTH,
        collapsed: { mobile: false, desktop: false },
      }}
      padding={0}
      styles={{
        root: {
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-main)',
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
        <div
          style={{
            height: HEADER_HEIGHT,
            pointerEvents: 'auto', // re-enable inside this strip so dragging works
          }}
        >
          <AlineaChrome />
        </div>
      </AppShell.Header>

      <AppShell.Navbar withBorder={false}>{sidebar}</AppShell.Navbar>

      <AppShell.Main>{main}</AppShell.Main>
    </AppShell>
  );
};