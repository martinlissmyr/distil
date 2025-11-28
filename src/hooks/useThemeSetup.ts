// src/hooks/useThemeSetup.ts
import { useEffect } from 'react';
import { useSystemTheme } from './useSystemTheme';

/**
 * Custom hook to set up Mantine theme based on system theme
 *
 * Automatically:
 * - Listens to system theme changes via useSystemTheme
 * - Updates Mantine's data-mantine-color-scheme attribute on document root
 */
export function useThemeSetup() {
  const systemTheme = useSystemTheme();

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mantine-color-scheme',
      systemTheme
    );
  }, [systemTheme]);
}
