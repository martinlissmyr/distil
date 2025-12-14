// src/hooks/useStoryHandlers.ts
import { useState, useCallback } from 'react';
import { client, StoryMeta, StoryData } from '../api/client';

// Type for EntityCRUD return value
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
  // Navigation methods
  goToProject: (projectId: string) => void;
  goToStory: (projectId: string, storyId: string, section?: string) => void;
  clearEditor: () => void;

  // Story editor methods
  loadStory: (story: StoryData) => void;
  setCurrentTitle: (title: string) => void;

  // CRUD operations
  storiesCRUD: EntityCRUD<StoryMeta>;
  stories: StoryMeta[];

  // Current state
  selectedProjectId: string | null;
  selectedStoryId: string | null;
}

export interface StoryHandlers {
  // Story CRUD handlers
  handleCreateStory: () => Promise<void>;
  handleSelectStory: (id: string) => Promise<void>;
  handleBackToProjectFromStory: () => void;
  handleReorderStories: (ids: string[]) => Promise<void>;

  // Edit modal state and handlers
  editingStory: { id: string; title: string } | null;
  handleOpenEditStory: (storyId: string) => void;
  handleCloseEditStory: () => void;
  handleRenameStory: (newTitle: string) => Promise<void>;
  handleDeleteStory: () => Promise<void>;
}

/**
 * Custom hook to manage all story-related handlers and modal state
 *
 * Consolidates story CRUD operations, navigation, and edit modal management
 */
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

  // Edit modal state
  const [editingStory, setEditingStory] = useState<{ id: string; title: string } | null>(null);

  // Story CRUD handlers
  const handleCreateStory = useCallback(async () => {
    if (!selectedProjectId) return;
    const title = `Untitled ${stories.length + 1}`;
    await storiesCRUD.create(title);
  }, [selectedProjectId, stories.length, storiesCRUD]);

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

  // Edit modal handlers
  const handleOpenEditStory = useCallback((storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;
    setEditingStory({ id: story.id, title: story.title });
  }, [stories]);

  const handleCloseEditStory = useCallback(() => {
    setEditingStory(null);
  }, []);

  const handleRenameStory = useCallback(async (newTitle: string) => {
    if (!editingStory || !selectedProjectId) return;
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    await storiesCRUD.update(editingStory.id, { title: trimmed });

    // Update current title if this is the currently open story
    if (selectedStoryId === editingStory.id) {
      setCurrentTitle(trimmed);
    }

    setEditingStory(null);
  }, [editingStory, selectedProjectId, selectedStoryId, storiesCRUD, setCurrentTitle]);

  const handleDeleteStory = useCallback(async () => {
    if (!editingStory || !selectedProjectId) return;
    await storiesCRUD.delete(editingStory.id);
    setEditingStory(null);
  }, [editingStory, selectedProjectId, storiesCRUD]);

  return {
    handleCreateStory,
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
