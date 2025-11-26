import { useEffect, useState } from 'react';

export function useSystemTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    window.theme.get().then((systemTheme) => setTheme(systemTheme));

    window.theme.onChange((systemTheme) => setTheme(systemTheme));
  }, []);

  return theme;
}