import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MantineProvider } from '@mantine/core';
import { useSystemTheme } from './hooks/useSystemTheme';
import '@mantine/core/styles.css';
import { appTheme } from './theme';

function Root() {
  const systemTheme = useSystemTheme();

  return (
    <MantineProvider
      theme={appTheme}
      defaultColorScheme="light"
      withGlobalStyles
      withNormalizeCSS
      forceColorScheme={window.theme ? undefined : 'light'}
    >
      <App />
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);