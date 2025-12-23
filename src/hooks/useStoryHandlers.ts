// src/hooks/useStoryHandlers.ts
import { useState, useCallback } from 'react';
import { client, StoryMeta, StoryData } from '../api/client';

interface EntityCRUD<T> {
  items: T[];
  isLoading: boolean;
  create: (data: any) => Promise<T | null>;
  update: (id: string, data: any) => Promise<T | null>;
  delete: (id: string) => Promise<boolean>;
  reorder: (ids: string[]) => Promise<boolean>;
  reload: () => Promise<void>;
  setItems: (items: T[]) => void;
}

export interface StoryHandlersParams {
  goToProject: (projectId: string) => void;
  goToStory: (projectId: string, storyId: string, section?: string) => void;
  clearEditor: () => void;

  loadStory: (story: StoryData) => void;
  setCurrentTitle: (title: string) => void;

  storiesCRUD: EntityCRUD<StoryMeta>;
  stories: StoryMeta[];

  selectedProjectId: string | null;
  selectedStoryId: string | null;
}

export interface StoryHandlers {
  // Create flow (NEW)
  creatingStory: boolean;
  handleCreateStory: () => void; // opens modal
  handleCloseCreateStory: () => void;
  handleConfirmCreateStory: (title: string) => Promise<void>;

  // Existing
  handleSelectStory: (id: string) => Promise<void>;
  handleBackToProjectFromStory: () => void;
  handleReorderStories: (ids: string[]) => Promise<void>;

  editingStory: { id: string; title: string } | null;
  handleOpenEditStory: (storyId: string) => void;
  handleCloseEditStory: () => void;

  /**
   * Called by EntityEditModal ON CLOSE ONLY.
   * Receives the final title (already trimmed/fallback-applied by the modal).
   */
  handleRenameStory: (finalTitle: string) => Promise<void>;

  handleDeleteStory: () => Promise<void>;
}

export function useStoryHandlers(params: StoryHandlersParams): StoryHandlers {
  const {
    goToProject,
    goToStory,
    clearEditor,
    loadStory,
    setCurrentTitle,
    storiesCRUD,
    stories,
    selectedProjectId,
    selectedStoryId,
  } = params;

  const [editingStory, setEditingStory] = useState<{ id: string; title: string } | null>(null);

  // NEW: create modal state
  const [creatingStory, setCreatingStory] = useState(false);

  // ---- Create flow (NEW) ----
  const handleCreateStory = useCallback(() => {
    if (!selectedProjectId) return;
    setCreatingStory(true);
  }, [selectedProjectId]);

  const handleCloseCreateStory = useCallback(() => {
    setCreatingStory(false);
  }, []);

  const handleConfirmCreateStory = useCallback(async (title: string) => {
    if (!selectedProjectId) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    const created = await storiesCRUD.create(trimmed);
    if (created) {
      setCreatingStory(false);
    }
  }, [selectedProjectId, storiesCRUD]);

  // ---- Existing behavior ----
  const handleSelectStory = useCallback(async (id: string) => {
    if (!selectedProjectId) return;
    goToStory(selectedProjectId, id, 'prose');

    const storyResponse = await client.loadStory(selectedProjectId, id);
    if (!storyResponse.ok) {
      console.error('Failed to load story:', storyResponse.error);
      return;
    }
    loadStory(storyResponse.data);
  }, [selectedProjectId, goToStory, loadStory]);

  const handleBackToProjectFromStory = useCallback(() => {
    if (!selectedProjectId) return;
    goToProject(selectedProjectId);
    clearEditor();
  }, [selectedProjectId, goToProject, clearEditor]);

  const handleReorderStories = useCallback(async (ids: string[]) => {
    await storiesCRUD.reorder(ids);
  }, [storiesCRUD]);

  // ---- Edit modal handlers ----
  const handleOpenEditStory = useCallback((storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;
    setEditingStory({ id: story.id, title: story.title });
  }, [stories]);

  const handleCloseEditStory = useCallback(() => {
    setEditingStory(null);
  }, []);

  // IMPORTANT: no trimming here; modal owns trimming/fallback-on-close.
  const handleRenameStory = useCallback(async (finalTitle: string) => {
    if (!selectedProjectId) return;

    // Use functional update to avoid stale closure bugs
    let storyId: string | null = null;
    let prevTitle: string | null = null;

    setEditingStory((prev) => {
      if (!prev) return prev;
      storyId = prev.id;
      prevTitle = prev.title;
      return prev; // no UI change yet; we update after save below
    });

    if (!storyId) return;

    // Avoid redundant writes
    if (prevTitle === finalTitle) return;

    await storiesCRUD.update(storyId, { title: finalTitle });

    // Sync modal state (keep it open)
    setEditingStory((prev) => (prev && prev.id === storyId ? { ...prev, title: finalTitle } : prev));

    // Sync editor title if open
    if (selectedStoryId === storyId) {
      setCurrentTitle(finalTitle);
    }
  }, [selectedProjectId, selectedStoryId, storiesCRUD, setCurrentTitle]);

  const handleDeleteStory = useCallback(async () => {
    if (!editingStory || !selectedProjectId) return;
    await storiesCRUD.delete(editingStory.id);
    setEditingStory(null);
  }, [editingStory, selectedProjectId, storiesCRUD]);

  return {
    creatingStory,
    handleCreateStory,
    handleCloseCreateStory,
    handleConfirmCreateStory,

    handleSelectStory,
    handleBackToProjectFromStory,
    handleReorderStories,

    editingStory,
    handleOpenEditStory,
    handleCloseEditStory,
    handleRenameStory,
    handleDeleteStory,
  };
}