// src/hooks/useStoryEditor.ts
import { useState, useEffect, useCallback } from 'react';
import { client, StoryData } from '../api/client';
import type { ProseDoc } from '../components/editor/ProseEditor';

/**
 * Custom hook to manage story editor state and autosave
 *
 * Handles:
 * - Story document and title state
 * - Dirty flag tracking
 * - Automatic saving after 1000ms of inactivity
 * - Manual save method
 *
 * Note: This hook does NOT load stories automatically. The parent component
 * should call loadStory() when navigating to a story.
 *
 * @param projectId - Current project ID (for autosave)
 * @param storyId - Current story ID (for autosave)
 */
export function useStoryEditor(projectId: string | null, storyId: string | null) {
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentDoc, setCurrentDoc] = useState<ProseDoc | null>(null);
  const [dirty, setDirty] = useState(false);

  /**
   * Load a story's content into the editor
   */
  const loadStory = useCallback((story: StoryData) => {
    setCurrentTitle(story.title);
    setCurrentDoc(story.doc);
    setDirty(false);
  }, []);

  /**
   * Clear the editor (when navigating away from a story)
   */
  const clearEditor = useCallback(() => {
    setCurrentTitle('');
    setCurrentDoc(null);
    setDirty(false);
  }, []);

  /**
   * Update the document content and mark as dirty
   */
  const updateDoc = useCallback((doc: ProseDoc) => {
    setCurrentDoc(doc);
    setDirty(true);
  }, []);

  /**
   * Update the title and mark as dirty
   */
  const updateTitle = useCallback((title: string) => {
    setCurrentTitle(title);
    setDirty(true);
  }, []);

  /**
   * Manually save the current story
   */
  const save = useCallback(async (projectId: string, storyId: string): Promise<boolean> => {
    if (!currentDoc) return false;

    const response = await client.saveStory(projectId, storyId, {
      id: storyId,
      title: currentTitle || 'Untitled',
      doc: currentDoc,
    });

    if (response.ok) {
      setDirty(false);
      return true;
    } else {
      console.error('Save failed:', response.error);
      return false;
    }
  }, [currentDoc, currentTitle]);

  /**
   * Autosave effect - saves 1000ms after changes when dirty
   */
  useEffect(() => {
    // Don't autosave if not dirty, no content, or no story selected
    if (!dirty || !currentDoc || !projectId || !storyId) return;

    const timeout = setTimeout(() => {
      (async () => {
        try {
          const response = await client.saveStory(projectId, storyId, {
            id: storyId,
            title: currentTitle || 'Untitled',
            doc: currentDoc,
          });
          if (response.ok) {
            setDirty(false);
          } else {
            console.error('Autosave failed:', response.error);
          }
        } catch (e) {
          console.error('Autosave failed', e);
        }
      })();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [dirty, currentDoc, currentTitle, projectId, storyId]);

  return {
    // State
    currentTitle,
    currentDoc,
    dirty,

    // Actions
    loadStory,
    clearEditor,
    updateDoc,
    updateTitle,
    save,

    // Direct setters (for compatibility)
    setCurrentTitle,
    setCurrentDoc,
    setDirty,
  };
}
