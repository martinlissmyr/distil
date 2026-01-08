import { useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MantineProvider } from '@mantine/core';
import { useResolvedUiSchema } from './hooks/useResolvedUiSchema';
import '@mantine/core/styles.css';
import { defaultTheme, metaTheme, proseTheme } from './theme';
import { useNavigation } from './hooks/useNavigation';
import { getSectionConfig } from './models/sections';
import type { UiMode } from './types/ui';

function Root() {
  const { resolved } = useResolvedUiSchema();
  const { leafId } = useNavigation();

  const uiMode: UiMode = useMemo(() => {
    const sectionConfig = getSectionConfig(leafId);
    return (sectionConfig?.uiMode as UiMode) ?? 'default';
  }, [leafId]);

  // 🔑 Sync uiMode → <body data-ui-mode="...">
  useEffect(() => {
    document.body.dataset.uiMode = uiMode;

    return () => {
      // Optional cleanup (mostly relevant if Root could unmount)
      delete document.body.dataset.uiMode;
    };
  }, [uiMode]);

  const themeByUiMode = useMemo(() => {
    if (uiMode === 'prose') return proseTheme;
    if (uiMode === 'meta') return metaTheme;
    return defaultTheme;
  }, [uiMode]);

  return (
    <MantineProvider
      theme={themeByUiMode}
      defaultColorScheme="dark"
      forceColorScheme={resolved}
    >
      <App />
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);