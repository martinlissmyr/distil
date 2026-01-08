// src/hooks/useStoryEditor.ts
import { useState, useEffect, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';
import { client } from '../api/client';
import { useAppStore } from '../state/useAppStore';

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
  const getCurrentPartId = useAppStore((state) => state.getCurrentPartId);
  const currentPartId = storyId ? getCurrentPartId(storyId) : undefined;
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentDoc, setCurrentDoc] = useState<JSONContent | null>(null);
  const [dirty, setDirty] = useState(false);

  // Watch store's currentPartDoc for part switching
  const currentPartDoc = useAppStore((state) => state.currentPartDoc);

  useEffect(() => {
    if (!currentPartDoc) return;

    console.log('[EDITOR] currentPartDoc changed, updating editor');
    // Update local editor state when part doc changes in store
    // Use setCurrentDoc directly to avoid triggering loadStory's dirty reset
    setCurrentDoc(currentPartDoc);
    setDirty(false); // New part is clean
  }, [currentPartDoc]);

  /**
   * Load a story's content into the editor
   */
  const loadStory = useCallback((story: { title: string; doc: JSONContent }) => {
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
  const updateDoc = useCallback((doc: JSONContent) => {
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
    if (!currentDoc || !currentPartId) return false;

    try {
      // Load metadata to get the story title for comparison
      const metadataResponse = await client.loadStoryMetadata(projectId, storyId);
      if (!metadataResponse.ok) {
        console.error('Failed to load story metadata:', metadataResponse.error);
        return false;
      }

      const metadata = metadataResponse.data;

      // Save the document to the current part
      const saveResponse = await client.savePartDoc(projectId, storyId, currentPartId, currentDoc);

      // Also update the story title if changed
      if (currentTitle !== metadata.title) {
        const updateResponse = await client.updateStory(projectId, storyId, {
          title: currentTitle || 'Untitled',
        });
        if (!updateResponse.ok) {
          console.error('Failed to update story title:', updateResponse.error);
        }
      }

      if (saveResponse.ok) {
        setDirty(false);
        return true;
      } else {
        console.error('Save failed:', saveResponse.error);
        return false;
      }
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }, [currentDoc, currentTitle, currentPartId]);

  /**
   * Autosave effect - saves 1000ms after changes when dirty
   */
  useEffect(() => {
    // Don't autosave if not dirty, no content, no story selected, or no current part
    if (!dirty || !currentDoc || !projectId || !storyId || !currentPartId) return;

    const timeout = setTimeout(() => {
      (async () => {
        try {
          // Load metadata to get the story title for comparison
          const metadataResponse = await client.loadStoryMetadata(projectId, storyId);
          if (!metadataResponse.ok) {
            console.error('Failed to load story metadata:', metadataResponse.error);
            return;
          }

          const metadata = metadataResponse.data;

          // Save the document to the current part
          const saveResponse = await client.savePartDoc(projectId, storyId, currentPartId, currentDoc);

          // Also update the story title if changed
          if (currentTitle !== metadata.title) {
            const updateResponse = await client.updateStory(projectId, storyId, {
              title: currentTitle || 'Untitled',
            });
            if (!updateResponse.ok) {
              console.error('Failed to update story title:', updateResponse.error);
            }
          }

          if (saveResponse.ok) {
            setDirty(false);
          } else {
            console.error('Autosave failed:', saveResponse.error);
          }
        } catch (e) {
          console.error('Autosave failed', e);
        }
      })();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [dirty, currentDoc, currentTitle, projectId, storyId, currentPartId]);

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
