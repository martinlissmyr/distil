// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import './styles/App.scss';

import { Box } from '@mantine/core';

import {
  alineaClient,
  Project,
  StoryMeta,
  StoryData,
} from './api/alineaClient';
import { useAppStore } from './state/useAppStore';
import { AlineaLayout } from './components/layout/AlineaLayout';
import { Sidebar } from './components/layout/Sidebar';
import type { ProseDoc } from './components/editor/ProseEditor';
import type { MetaDoc } from './components/editor/MetaTextEditor';
import { ManifestView } from './components/manifest/ManifestView';
import { ProjectsView } from './components/projects/ProjectsView';
import { StoriesView } from './components/stories/StoriesView';
import { StoryTextView } from './components/stories/StoryTextView';
import { useThemeSetup } from './hooks/useThemeSetup';
import { EntityEditModal } from './components/common/EntityEditModal';
import { StoryOutlineView } from './components/stories/StoryOutlineView';
import { StoryBriefView } from './components/stories/StoryBriefView';
import { ApiKeyModal } from './components/settings/ApiKeyModal';
import { useNavigation } from './hooks/useNavigation';
import type { StorySection, RootSection, AppSection } from './hooks/useNavigation';
import { useEntityCRUD } from './hooks/useEntityCRUD';
import { useStoryEditor } from './hooks/useStoryEditor';
import { useAppInitialization } from './hooks/useAppInitialization';

// ---------------
// Types
type EditingProjectState = {
  id: string;
  name: string;
} | null;

type EditingStoryState = {
  id: string;
  title: string;
} | null;

const App: React.FC = () => {
  const ensureMetaDocsLoaded = useAppStore((s) => s.ensureMetaDocsLoaded);

  // Preload manifest on app start
  useEffect(() => {
    void ensureMetaDocsLoaded({ kind: 'root' }, ['manifest']);
  }, [ensureMetaDocsLoaded]);

  // Navigation hook
  const navigation = useNavigation();
  const {
    appSection,
    rootSection,
    storySection,
    selectedProjectId,
    selectedStoryId,
    goToProjects,
    goToProject,
    goToStory,
    setStorySection,
    loadSavedState,
    restoreState,
    finishInitialization,
  } = navigation;

  // Entity CRUD hooks
  const projectsCRUD = useEntityCRUD<Project, string, { name: string }>({
    list: alineaClient.listProjects,
    create: (name: string) => alineaClient.createProject(name),
    update: (id, data) => alineaClient.updateProject(id, data),
    delete: (id) => alineaClient.deleteProject(id),
    reorder: (ids) => alineaClient.reorderProjects(ids),
  }, {
    onCreate: async (created) => {
      // Navigate to new project and load its stories
      goToProject(created.id);
      clearEditor();

      // Load stories for the new project (use created.id directly)
      const listResponse = await alineaClient.listStories(created.id);
      if (listResponse.ok) {
        storiesCRUD.setItems(listResponse.data);
      } else {
        console.error('Failed to list stories:', listResponse.error);
      }
    },
    onDelete: (deletedId) => {
      // Navigate away if deleted project was selected
      if (selectedProjectId === deletedId) {
        goToProjects();
        clearEditor();
      }
    },
  });

  const storiesCRUD = useEntityCRUD<StoryMeta, string, { title: string }>({
    list: () => {
      if (!selectedProjectId) {
        return Promise.resolve({ ok: true, data: [] } as any);
      }
      return alineaClient.listStories(selectedProjectId);
    },
    create: (title: string) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return alineaClient.createStory(selectedProjectId, title);
    },
    update: (id, data) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return alineaClient.updateStory(selectedProjectId, id, data);
    },
    delete: (id) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return alineaClient.deleteStory(selectedProjectId, id);
    },
    reorder: (ids) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return alineaClient.reorderStories(selectedProjectId, ids);
    },
  }, {
    onCreate: async (created) => {
      // Navigate to new story and load it
      if (!selectedProjectId) return;
      goToStory(selectedProjectId, created.id, 'prose');

      const storyResponse = await alineaClient.loadStory(selectedProjectId, created.id);
      if (!storyResponse.ok) {
        console.error('Failed to load story:', storyResponse.error);
        return;
      }
      loadStory(storyResponse.data);
    },
    onDelete: (deletedId) => {
      // Navigate away if deleted story was selected
      if (selectedProjectId && selectedStoryId === deletedId) {
        goToProject(selectedProjectId);
        clearEditor();
      }
    },
  });

  // Destructure for easier access
  const projects = projectsCRUD.items;
  const stories = storiesCRUD.items;

  // Story editor hook
  const storyEditor = useStoryEditor(selectedProjectId, selectedStoryId);
  const { currentTitle, currentDoc, dirty, loadStory, clearEditor, updateDoc, setCurrentTitle, setCurrentDoc, setDirty } = storyEditor;

  // App initialization hook
  useAppInitialization({
    loadSavedState,
    restoreState,
    finishInitialization,
    setProjects: projectsCRUD.setItems,
    setStories: storiesCRUD.setItems,
    loadStory,
    clearEditor,
  });

  // Note: Manifest, outline and brief are managed by MetaTextEditor via metaDocs system
  // They autosave independently without needing App-level state

  // Edit modals
  const [editingProject, setEditingProject] = useState<EditingProjectState>(null);
  const [editingStory, setEditingStory] = useState<EditingStoryState>(null);

  // API Key Modal
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Theme setup
  useThemeSetup();

  // ---- Editor mode attribute (for styling) ----
  useEffect(() => {
    let editorMode: 'prose' | 'meta' | 'none' = 'none';

    if (appSection === 'story' && storySection === 'prose' && selectedStoryId) {
      editorMode = 'prose';
    } else if (
      (appSection === 'root' && rootSection === 'manifest') ||
      (appSection === 'story' &&
        (storySection === 'outline' || storySection === 'brief'))
    ) {
      editorMode = 'meta';
    }

    document.documentElement.dataset.editorMode = editorMode;
  }, [appSection, storySection, rootSection, selectedStoryId]);

  // ---- Handlers ----
  const handleDocChange = useCallback((doc: ProseDoc) => {
    updateDoc(doc);
  }, [updateDoc]);

  const handleSelectRootSection = (section: RootSection) => {
    if (section === 'manifest') {
      navigation.goToManifest();
    } else if (section === 'assistant') {
      navigation.goToAssistant();
    } else {
      navigation.goToProjects();
    }

    if (section !== 'projects') {
      clearEditor();
    }
  };

  // ---- Project actions ----
  const handleCreateProject = async () => {
    await projectsCRUD.create('New project');
  };

  const handleSelectProject = async (id: string) => {
    goToProject(id);
    clearEditor();

    // Load stories for this project (use id directly, not selectedProjectId which updates async)
    const listResponse = await alineaClient.listStories(id);
    if (listResponse.ok) {
      storiesCRUD.setItems(listResponse.data);
    } else {
      console.error('Failed to list stories:', listResponse.error);
    }
  };

  const handleBackToProjects = () => {
    goToProjects();
    clearEditor();
  };

  const handleReorderProjects = async (ids: string[]) => {
    await projectsCRUD.reorder(ids);
  };

  // ---- Project edit modal handlers ----
  const handleOpenEditProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    setEditingProject({ id: proj.id, name: proj.name });
  };

  const handleCloseEditProject = () => {
    setEditingProject(null);
  };

  const handleRenameProject = async (newName: string) => {
    if (!editingProject) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    await projectsCRUD.update(editingProject.id, { name: trimmed });
    setEditingProject(null);
  };

  const handleDeleteProject = async () => {
    if (!editingProject) return;
    await projectsCRUD.delete(editingProject.id);
    setEditingProject(null);
  };

  // ---- Story actions ----
  const handleCreateStory = async () => {
    if (!selectedProjectId) return;
    const title = `Untitled ${stories.length + 1}`;
    await storiesCRUD.create(title);
  };

  const handleSelectStory = async (id: string) => {
    if (!selectedProjectId) return;
    goToStory(selectedProjectId, id, 'prose');

    const storyResponse = await alineaClient.loadStory(selectedProjectId, id);
    if (!storyResponse.ok) {
      console.error('Failed to load story:', storyResponse.error);
      return;
    }
    loadStory(storyResponse.data);
  };

  const handleBackToProjectFromStory = () => {
    if (!selectedProjectId) return;
    goToProject(selectedProjectId);
    clearEditor();
  };

  const handleReorderStories = async (ids: string[]) => {
    await storiesCRUD.reorder(ids);
  };

  // ---- Story edit modal handlers ----
  const handleOpenEditStory = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;
    setEditingStory({ id: story.id, title: story.title });
  };

  const handleCloseEditStory = () => {
    setEditingStory(null);
  };

  const handleRenameStory = async (newTitle: string) => {
    if (!editingStory || !selectedProjectId) return;
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    await storiesCRUD.update(editingStory.id, { title: trimmed });

    // Update current title if this is the currently open story
    if (selectedStoryId === editingStory.id) {
      setCurrentTitle(trimmed);
    }

    setEditingStory(null);
  };

  const handleDeleteStory = async () => {
    if (!editingStory || !selectedProjectId) return;
    await storiesCRUD.delete(editingStory.id);
    setEditingStory(null);
  };

  // Note: Story (prose) autosave is handled by useStoryEditor hook
  // Manifest, outline and brief autosave are handled by MetaTextEditor via metaDocs system

  // ---- Sidebar props ----
  const sidebar = (
    <Sidebar
      mode={
        appSection === 'root'
          ? 'projects'
          : appSection === 'project'
          ? 'project'
          : 'story'
      }
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={handleSelectProject}
      onCreateProject={handleCreateProject}
      onBackToProjects={handleBackToProjects}
      onReorderProjects={handleReorderProjects}
      stories={stories}
      selectedStoryId={selectedStoryId}
      onSelectStory={handleSelectStory}
      onReorderStories={handleReorderStories}
      storySection={storySection}
      onSelectStorySection={setStorySection}
      onBackToProjectFromStory={handleBackToProjectFromStory}
      rootSection={rootSection}
      onSelectRootSection={handleSelectRootSection}
      onOpenSettings={() => setApiKeyModalOpen(true)}
    />
  );

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // ---- Main content ----
  const main =
    appSection === 'root' && rootSection === 'projects' ? (
      <ProjectsView
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onEditProject={handleOpenEditProject}
      />
    ) : appSection === 'root' && rootSection === 'manifest' ? (
      <ManifestView />
    ) : appSection === 'root' && rootSection === 'assistant' ? (
      <Box p="md">Assistant settings (placeholder)</Box>
    ) : appSection === 'project' && selectedProjectId && !selectedStoryId ? (
      <StoriesView
        stories={stories}
        currentProject={currentProject}
        onSelectStory={handleSelectStory}
        onCreateStory={handleCreateStory}
        onEditStory={handleOpenEditStory}
      />
    ) : appSection === 'story' && selectedProjectId && selectedStoryId ? (
      storySection === 'prose' ? (
        <StoryTextView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
          doc={currentDoc}
          onChange={handleDocChange}
          title={currentTitle}
        />
      ) : storySection === 'outline' ? (
        <StoryOutlineView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
        />
      ) : storySection === 'brief' ? (
        <StoryBriefView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
        />
      ) : storySection === 'characters' ? (
        <Box p="md">Characters (placeholder)</Box>
      ) : storySection === 'locations' ? (
        <Box p="md">Locations (placeholder)</Box>
      ) : null
    ) : (
      <Box p="md">Invalid state</Box>
    );

  return (
    <>
      <AlineaLayout sidebar={sidebar} main={main} />

      {/* Project edit modal */}
      <EntityEditModal
        opened={!!editingProject}
        title="Edit project"
        fieldLabel="Name"
        deleteLabel="project"
        initialName={editingProject?.name ?? ''}
        onClose={handleCloseEditProject}
        onSave={handleRenameProject}
        onDelete={handleDeleteProject}
      />

      {/* Story edit modal */}
      <EntityEditModal
        opened={!!editingStory}
        title="Edit story"
        fieldLabel="Title"
        deleteLabel="story"
        initialName={editingStory?.title ?? ''}
        onClose={handleCloseEditStory}
        onSave={handleRenameStory}
        onDelete={handleDeleteStory}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        opened={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />
    </>
  );
};

export default App;