// src/hooks/useProjectHandlers.ts
import { useState, useCallback } from 'react';
import { client, Project, StoryMeta } from '../api/client';
import type { RootSection } from './useNavigation';

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
  goToProjects: () => void;
  goToManifest: () => void;
  goToPlayground: () => void;
  goToProject: (projectId: string) => void;
  clearEditor: () => void;

  projectsCRUD: EntityCRUD<Project>;
  projects: Project[];

  setStories: (stories: StoryMeta[]) => void;
}

export interface ProjectHandlers {
  handleSelectRootSection: (section: RootSection) => void;
  handleBackToProjects: () => void;

  // Create flow (NEW)
  creatingProject: boolean;
  handleCreateProject: () => void; // opens modal
  handleCloseCreateProject: () => void;
  handleConfirmCreateProject: (name: string) => Promise<void>;

  // Existing
  handleSelectProject: (id: string) => Promise<void>;
  handleReorderProjects: (ids: string[]) => Promise<void>;

  editingProject: { id: string; name: string } | null;
  handleOpenEditProject: (projectId: string) => void;
  handleCloseEditProject: () => void;
  handleRenameProject: (newName: string) => Promise<void>;
  handleDeleteProject: () => Promise<void>;
}

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

  const [editingProject, setEditingProject] = useState<{ id: string; name: string } | null>(null);

  // NEW: create modal state
  const [creatingProject, setCreatingProject] = useState(false);

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

  // ---- Create flow (NEW) ----
  const handleCreateProject = useCallback(() => {
    setCreatingProject(true);
  }, []);

  const handleCloseCreateProject = useCallback(() => {
    setCreatingProject(false);
  }, []);

  const handleConfirmCreateProject = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const created = await projectsCRUD.create(trimmed);
    // onCreate side-effects (navigate + load stories) still happen via useEntityCRUD options in App.tsx
    if (created) {
      setCreatingProject(false);
    }
  }, [projectsCRUD]);

  // ---- Existing behavior ----
  const handleSelectProject = useCallback(async (id: string) => {
    goToProject(id);
    clearEditor();

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

  // ---- Edit modal handlers ----
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

    // ✅ Keep modal open; sync local modal state
    setEditingProject((prev) =>
      prev ? { ...prev, name: trimmed } : prev
    );
  }, [editingProject, projectsCRUD]);

  const handleDeleteProject = useCallback(async () => {
    if (!editingProject) return;
    await projectsCRUD.delete(editingProject.id);
    setEditingProject(null);
  }, [editingProject, projectsCRUD]);

  return {
    handleSelectRootSection,
    handleBackToProjects,

    creatingProject,
    handleCreateProject,
    handleCloseCreateProject,
    handleConfirmCreateProject,

    handleSelectProject,
    handleReorderProjects,

    editingProject,
    handleOpenEditProject,
    handleCloseEditProject,
    handleRenameProject,
    handleDeleteProject,
  };
}