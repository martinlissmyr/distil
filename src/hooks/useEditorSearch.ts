// src/hooks/useEditorSearch.ts
import { useState, useEffect } from 'react';

export type EditorSearchResult = {
  searchPanelOpen: boolean;
  setSearchPanelOpen: (open: boolean) => void;
  toggleSearchPanel: () => void;
};

/**
 * Hook to manage editor search panel state and keyboard shortcuts
 *
 * Listens for Cmd+F / Ctrl+F and toggles search panel visibility
 *
 * @returns Object with search panel state and controls
 */
export function useEditorSearch(): EditorSearchResult {
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);

  // Keyboard listener for Cmd+F / Ctrl+F to toggle search panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchPanelOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    searchPanelOpen,
    setSearchPanelOpen,
    toggleSearchPanel: () => setSearchPanelOpen((prev) => !prev),
  };
}
