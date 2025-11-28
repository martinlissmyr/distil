import { useEffect, useState } from 'react';

export function useSystemTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    window.theme.get().then((response) => {
      if (response.ok) {
        setTheme(response.data);
      } else {
        console.error('Failed to get system theme:', response.error);
      }
    });

    window.theme.onChange((systemTheme) => setTheme(systemTheme));
  }, []);

  return theme;
}