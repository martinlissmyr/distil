import React, { useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MantineProvider } from '@mantine/core';
import { useSystemTheme } from './hooks/useSystemTheme';
import '@mantine/core/styles.css';
import { defaultTheme, metaTheme, proseTheme } from './theme';
import { useNavigation } from './hooks/useNavigation';
import { getSectionConfig } from './models/sections';
import type { uiMode } from './types/ui/';

function Root() {
  useSystemTheme();

  const { leafId } = useNavigation();

  const uiMode: UiMode = useMemo(() => {
    const sectionConfig = getSectionConfig(leafId);
    return (sectionConfig?.uiMode as UiMode) ?? 'default';
  }, [leafId]);

  const themeByUiMode = useMemo(() => {
    if (uiMode === 'prose') return proseTheme;
    if (uiMode === 'meta') return metaTheme;
    return defaultTheme;
  }, [uiMode]);

  return (
    <MantineProvider
      theme={themeByUiMode}
      defaultColorScheme="light"
      forceColorScheme={window.theme ? undefined : 'light'}
    >
      <div data-ui-mode={uiMode} style={{ height: '100%' }}>
        <App />
      </div>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);