// src/hooks/useProjectHandlers.ts
import { useState, useCallback } from 'react';
import { client, Project, StoryMeta } from '../api/client';
import type { RootSection } from './useNavigation';

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

export interface ProjectHandlersParams {
  // Navigation methods
  goToProjects: () => void;
  goToManifest: () => void;
  goToPlayground: () => void;
  goToProject: (projectId: string) => void;
  clearEditor: () => void;

  // CRUD operations
  projectsCRUD: EntityCRUD<Project>;
  projects: Project[];

  // Story operations (for loading stories when selecting project)
  setStories: (stories: StoryMeta[]) => void;
}

export interface ProjectHandlers {
  // Navigation handlers
  handleSelectRootSection: (section: RootSection) => void;
  handleBackToProjects: () => void;

  // Project CRUD handlers
  handleCreateProject: () => Promise<void>;
  handleSelectProject: (id: string) => Promise<void>;
  handleReorderProjects: (ids: string[]) => Promise<void>;

  // Edit modal state and handlers
  editingProject: { id: string; name: string } | null;
  handleOpenEditProject: (projectId: string) => void;
  handleCloseEditProject: () => void;
  handleRenameProject: (newName: string) => Promise<void>;
  handleDeleteProject: () => Promise<void>;
}

/**
 * Custom hook to manage all project-related handlers and modal state
 *
 * Consolidates project CRUD operations, navigation, and edit modal management
 */
export function useProjectHandlers(params: ProjectHandlersParams): ProjectHandlers {
  const {
    goToProjects,
    goToManifest,
    goToPlayground,
    goToProject,
    clearEditor,
    projectsCRUD,
    projects,
    setStories,
  } = params;

  // Edit modal state
  const [editingProject, setEditingProject] = useState<{ id: string; name: string } | null>(null);

  // Navigation handlers
  const handleSelectRootSection = useCallback((section: RootSection) => {
    if (section === 'manifest') {
      goToManifest();
    } else if (section === 'playground') {
      goToPlayground();
    } else {
      goToProjects();
    }

    if (section !== 'projects') {
      clearEditor();
    }
  }, [goToManifest, goToPlayground, goToProjects, clearEditor]);

  const handleBackToProjects = useCallback(() => {
    goToProjects();
    clearEditor();
  }, [goToProjects, clearEditor]);

  // Project CRUD handlers
  const handleCreateProject = useCallback(async () => {
    await projectsCRUD.create('New project');
  }, [projectsCRUD]);

  const handleSelectProject = useCallback(async (id: string) => {
    goToProject(id);
    clearEditor();

    // Load stories for this project (use id directly, not selectedProjectId which updates async)
    const listResponse = await client.listStories(id);
    if (listResponse.ok) {
      setStories(listResponse.data);
    } else {
      console.error('Failed to list stories:', listResponse.error);
    }
  }, [goToProject, clearEditor, setStories]);

  const handleReorderProjects = useCallback(async (ids: string[]) => {
    await projectsCRUD.reorder(ids);
  }, [projectsCRUD]);

  // Edit modal handlers
  const handleOpenEditProject = useCallback((projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    setEditingProject({ id: proj.id, name: proj.name });
  }, [projects]);

  const handleCloseEditProject = useCallback(() => {
    setEditingProject(null);
  }, []);

  const handleRenameProject = useCallback(async (newName: string) => {
    if (!editingProject) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    await projectsCRUD.update(editingProject.id, { name: trimmed });
    setEditingProject(null);
  }, [editingProject, projectsCRUD]);

  const handleDeleteProject = useCallback(async () => {
    if (!editingProject) return;
    await projectsCRUD.delete(editingProject.id);
    setEditingProject(null);
  }, [editingProject, projectsCRUD]);

  return {
    handleSelectRootSection,
    handleBackToProjects,
    handleCreateProject,
    handleSelectProject,
    handleReorderProjects,
    editingProject,
    handleOpenEditProject,
    handleCloseEditProject,
    handleRenameProject,
    handleDeleteProject,
  };
}
