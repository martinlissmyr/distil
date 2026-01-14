// src/ui/editor/SearchPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TextInput, ActionIcon, Group, Paper, Text } from '@mantine/core';
import { Editor } from '@tiptap/react';
import { SearchQuery, setSearchState, findNext, findPrev } from 'prosemirror-search';
import { Icon } from '../../common/Icon';
import styles from './SearchPanel.module.scss';

export type SearchPanelProps = {
  editor: Editor;
  onClose: () => void;
};

export const SearchPanel: React.FC<SearchPanelProps> = ({ editor, onClose }) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectionFrom, setSelectionFrom] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevSearchValueRef = useRef('');

  // Auto-focus and select text on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Track selection changes to trigger match counter updates
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      setSelectionFrom(editor.state.selection.from);
    };

    // Update immediately
    updateSelection();

    // Listen for transaction updates
    const { view } = editor;
    const originalDispatch = view.dispatch;
    view.dispatch = (tr) => {
      originalDispatch(tr);
      if (tr.selectionSet) {
        updateSelection();
      }
    };

    return () => {
      view.dispatch = originalDispatch;
    };
  }, [editor]);

  // Update search query when search value changes
  useEffect(() => {
    if (!editor) return;

    const timeoutId = setTimeout(() => {
      if (searchValue.trim()) {
        const query = new SearchQuery({ search: searchValue, caseSensitive: false });
        const tr = editor.state.tr;
        setSearchState(tr, query);
        editor.view.dispatch(tr);
      } else {
        const tr = editor.state.tr;
        setSearchState(tr, new SearchQuery({ search: '' }));
        editor.view.dispatch(tr);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchValue, editor]);

  // Auto-highlight first result when new search results appear
  useEffect(() => {
    if (!editor || !searchValue.trim()) return;

    // Check if the search query has actually changed
    const searchQueryChanged = searchValue !== prevSearchValueRef.current;
    prevSearchValueRef.current = searchValue;

    // Only auto-navigate if the search query changed (not just navigation)
    if (!searchQueryChanged) return;

    // Wait slightly longer than the search debounce (100ms) to ensure results are ready
    const timeoutId = setTimeout(() => {
      const total = getTotalMatches();
      if (total > 0) {
        // Auto-navigate to first match when search query changes
        findNext(editor.state, editor.view.dispatch);
        // Scroll to the first match
        requestAnimationFrame(() => {
          const { from } = editor.state.selection;
          const coords = editor.view.coordsAtPos(from);

          const editorElement = editor.view.dom;
          const scrollContainer = editorElement.closest('.mantine-ScrollArea-viewport');

          if (scrollContainer && coords) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const relativeTop = coords.top - containerRect.top;

            if (relativeTop < 100 || relativeTop > containerRect.height - 100) {
              scrollContainer.scrollTop += relativeTop - containerRect.height / 2;
            }
          }
        });
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [searchValue, editor]);

  // Calculate total matches by searching through the document
  const getTotalMatches = (): number => {
    if (!editor || !searchValue.trim()) return 0;

    const query = new SearchQuery({ search: searchValue, caseSensitive: false });
    if (!query.valid) return 0;

    let count = 0;
    let pos = 0;
    const docSize = editor.state.doc.content.size;

    while (pos < docSize) {
      const result = query.findNext(editor.state, pos);
      if (!result) break;
      count++;
      pos = result.to;
    }

    return count;
  };

  // Get current selection position to determine which match we're on
  const getCurrentMatchIndex = (totalMatches: number): number => {
    if (!editor || !searchValue.trim() || totalMatches === 0) return -1;

    const query = new SearchQuery({ search: searchValue, caseSensitive: false });
    if (!query.valid) return -1;

    const { from } = editor.state.selection;
    let pos = 0;
    let index = 0;

    while (pos < from) {
      const result = query.findNext(editor.state, pos);
      if (!result) break;
      if (result.from <= from && result.to >= from) {
        return index;
      }
      index++;
      pos = result.to;
    }

    return -1;
  };

  // Recalculate matches and current index whenever selection changes
  const totalMatches = getTotalMatches();
  const currentIndex = getCurrentMatchIndex(totalMatches);
  const displayIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

  // Force re-render when selection changes by including selectionFrom in the calculation
  useEffect(() => {
    // This effect ensures the counter updates when selectionFrom changes
    if (searchValue.trim() && totalMatches > 0) {
      getCurrentMatchIndex(totalMatches);
    }
  }, [selectionFrom]);

  // Navigation handlers
  const handleNext = () => {
    if (editor && searchValue.trim() && totalMatches > 0) {
      findNext(editor.state, editor.view.dispatch);
      // Wait for the next frame after the selection changes, then scroll
      requestAnimationFrame(() => {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);

        // Find the ScrollArea viewport (it's the scrollable container)
        const editorElement = editor.view.dom;
        const scrollContainer = editorElement.closest('.mantine-ScrollArea-viewport');

        if (scrollContainer && coords) {
          // Get the container's bounding rect
          const containerRect = scrollContainer.getBoundingClientRect();

          // Calculate if we need to scroll
          const relativeTop = coords.top - containerRect.top;

          // Scroll if the match is not visible (with some padding)
          if (relativeTop < 100 || relativeTop > containerRect.height - 100) {
            scrollContainer.scrollTop += relativeTop - containerRect.height / 2;
          }
        }
      });
    }
  };

  const handlePrevious = () => {
    if (editor && searchValue.trim() && totalMatches > 0) {
      findPrev(editor.state, editor.view.dispatch);
      // Wait for the next frame after the selection changes, then scroll
      requestAnimationFrame(() => {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);

        // Find the ScrollArea viewport (it's the scrollable container)
        const editorElement = editor.view.dom;
        const scrollContainer = editorElement.closest('.mantine-ScrollArea-viewport');

        if (scrollContainer && coords) {
          // Get the container's bounding rect
          const containerRect = scrollContainer.getBoundingClientRect();

          // Calculate if we need to scroll
          const relativeTop = coords.top - containerRect.top;

          // Scroll if the match is not visible (with some padding)
          if (relativeTop < 100 || relativeTop > containerRect.height - 100) {
            scrollContainer.scrollTop += relativeTop - containerRect.height / 2;
          }
        }
      });
    }
  };

  // Cleanup function to clear search highlights
  const handleClose = () => {
    if (editor) {
      const tr = editor.state.tr;
      const emptyQuery = new SearchQuery({ search: '' });
      setSearchState(tr, emptyQuery);
      editor.view.dispatch(tr);
    }
    onClose();
  };

  // Keyboard handlers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <Paper className={styles.searchPanel} shadow="md">
      <Group gap="xs" wrap="nowrap">
        <Icon type="search" size={16} style={{ opacity: 0.5, flexShrink: 0 }} />

        <TextInput
          ref={inputRef}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          variant="unstyled"
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
        />

        {searchValue.trim() && (
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {totalMatches > 0 ? `${displayIndex} of ${totalMatches}` : 'No matches'}
          </Text>
        )}

        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={handlePrevious}
          disabled={!searchValue.trim() || totalMatches === 0}
          style={{ flexShrink: 0 }}
        >
          <Icon type="up" size={16} />
        </ActionIcon>

        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={handleNext}
          disabled={!searchValue.trim() || totalMatches === 0}
          style={{ flexShrink: 0 }}
        >
          <Icon type="down" size={16} />
        </ActionIcon>

        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={handleClose}
          style={{ flexShrink: 0 }}
        >
          <Icon type="close" size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
};
