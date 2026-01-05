// src/hooks/useStoryEditor.ts
import { useState, useEffect, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';
import { client } from '../api/client';

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
  const [currentDoc, setCurrentDoc] = useState<JSONContent | null>(null);
  const [dirty, setDirty] = useState(false);

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
   * TODO: Update to use proper part ID from app store
   */
  const save = useCallback(async (projectId: string, storyId: string): Promise<boolean> => {
    if (!currentDoc) return false;

    try {
      // Load metadata to get the first part ID
      const metadataResponse = await client.loadStoryMetadata(projectId, storyId);
      if (!metadataResponse.ok) {
        console.error('Failed to load story metadata:', metadataResponse.error);
        return false;
      }

      const metadata = metadataResponse.data;

      // If no parts exist, create the first part
      if (metadata.parts.length === 0) {
        const createResponse = await client.createPart(projectId, storyId, 0);
        if (!createResponse.ok) {
          console.error('Failed to create part:', createResponse.error);
          return false;
        }
        metadata.parts = [createResponse.data];
      }

      const firstPartId = metadata.parts[0].id;

      // Save the document to the first part
      const saveResponse = await client.savePartDoc(projectId, storyId, firstPartId, currentDoc);

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
  }, [currentDoc, currentTitle]);

  /**
   * Autosave effect - saves 1000ms after changes when dirty
   * TODO: Update to use proper part ID from app store
   */
  useEffect(() => {
    // Don't autosave if not dirty, no content, or no story selected
    if (!dirty || !currentDoc || !projectId || !storyId) return;

    const timeout = setTimeout(() => {
      (async () => {
        try {
          // Load metadata to get the first part ID
          const metadataResponse = await client.loadStoryMetadata(projectId, storyId);
          if (!metadataResponse.ok) {
            console.error('Failed to load story metadata:', metadataResponse.error);
            return;
          }

          const metadata = metadataResponse.data;

          // If no parts exist, create the first part
          if (metadata.parts.length === 0) {
            const createResponse = await client.createPart(projectId, storyId, 0);
            if (!createResponse.ok) {
              console.error('Failed to create part:', createResponse.error);
              return;
            }
            metadata.parts = [createResponse.data];
          }

          const firstPartId = metadata.parts[0].id;

          // Save the document to the first part
          const saveResponse = await client.savePartDoc(projectId, storyId, firstPartId, currentDoc);

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
