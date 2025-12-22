// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import './styles/App.scss';

import {
  client,
  Project,
  StoryMeta,
  StoryData,
} from './api/client';
import { useAppStore } from './state/useAppStore';
import { AppLayout } from './components/layout/AppLayout';
import { Sidebar } from './components/layout/Sidebar';
import type { ProseDoc } from './components/editor/ProseEditor';
import { useThemeSetup } from './hooks/useThemeSetup';
import { AppContent } from './components/layout/AppContent';
import { AppModals } from './components/common/AppModals';
import { useNavigation } from './hooks/useNavigation';
import type { StorySection, RootSection, AppSection } from './hooks/useNavigation';
import { useEntityCRUD } from './hooks/useEntityCRUD';
import { useStoryEditor } from './hooks/useStoryEditor';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useProjectHandlers } from './hooks/useProjectHandlers';
import { useStoryHandlers } from './hooks/useStoryHandlers';

const App: React.FC = () => {
  const ensureMetaDocsLoaded = useAppStore((s) => s.ensureMetaDocsLoaded);

  // Preload manifest on app start
  useEffect(() => {
    void ensureMetaDocsLoaded({ scope: 'root' }, ['manifest']);
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
    list: client.listProjects,
    create: (name: string) => client.createProject(name),
    update: (id, data) => client.updateProject(id, data),
    delete: (id) => client.deleteProject(id),
    reorder: (ids) => client.reorderProjects(ids),
  }, {
    onCreate: async (created) => {
      // Navigate to new project and load its stories
      goToProject(created.id);
      clearEditor();

      // Load stories for the new project (use created.id directly)
      const listResponse = await client.listStories(created.id);
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
      return client.listStories(selectedProjectId);
    },
    create: (title: string) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return client.createStory(selectedProjectId, title);
    },
    update: (id, data) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return client.updateStory(selectedProjectId, id, data);
    },
    delete: (id) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return client.deleteStory(selectedProjectId, id);
    },
    reorder: (ids) => {
      if (!selectedProjectId) {
        return Promise.reject(new Error('No project selected'));
      }
      return client.reorderStories(selectedProjectId, ids);
    },
  }, {
    onCreate: async (created) => {
      // Navigate to new story and load it
      if (!selectedProjectId) return;
      goToStory(selectedProjectId, created.id, 'prose');

      const storyResponse = await client.loadStory(selectedProjectId, created.id);
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

  // API Key Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Wizard Modal
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const activeWizard = useAppStore((s) => s.activeWizard);

  // Open wizard modal when wizard starts
  useEffect(() => {
    setWizardModalOpen(!!activeWizard);
  }, [activeWizard]);

  const handleCloseWizardModal = () => {
    const { closeWizard } = useAppStore.getState();
    const confirmed = closeWizard(false);
    if (confirmed) {
      setWizardModalOpen(false);
    }
  };

  // Theme setup
  useThemeSetup();

  // ---- Project handlers ----
  const projectHandlers = useProjectHandlers({
    goToProjects,
    goToManifest: navigation.goToManifest,
    goToPlayground: navigation.goToPlayground,
    goToProject,
    clearEditor,
    projectsCRUD,
    projects,
    setStories: storiesCRUD.setItems,
  });

  // ---- Story handlers ----
  const storyHandlers = useStoryHandlers({
    goToProject,
    goToStory,
    clearEditor,
    loadStory,
    setCurrentTitle,
    storiesCRUD,
    stories,
    selectedProjectId,
    selectedStoryId,
  });

  // ---- Handlers ----
  const handleDocChange = useCallback((doc: ProseDoc) => {
    updateDoc(doc);
  }, [updateDoc]);

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
      onSelectProject={projectHandlers.handleSelectProject}
      onCreateProject={projectHandlers.handleCreateProject}
      onBackToProjects={projectHandlers.handleBackToProjects}
      stories={stories}
      selectedStoryId={selectedStoryId}
      onSelectStory={storyHandlers.handleSelectStory}
      storySection={storySection}
      onSelectStorySection={setStorySection}
      onBackToProjectFromStory={storyHandlers.handleBackToProjectFromStory}
      rootSection={rootSection}
      onSelectRootSection={projectHandlers.handleSelectRootSection}
      onOpenSettings={() => setSettingsModalOpen(true)}
      onOpenDevTools={() => client.openDevTools()}
    />
  );

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // ---- Main content ----
  const main = (
    <AppContent
      appSection={appSection}
      rootSection={rootSection}
      storySection={storySection}
      selectedProjectId={selectedProjectId}
      selectedStoryId={selectedStoryId}
      projects={projects}
      stories={stories}
      currentProject={currentProject}
      currentDoc={currentDoc}
      currentTitle={currentTitle}
      handleSelectProject={projectHandlers.handleSelectProject}
      handleCreateProject={projectHandlers.handleCreateProject}
      onReorderProjects={projectHandlers.handleReorderProjects}
      handleOpenEditProject={projectHandlers.handleOpenEditProject}
      handleSelectStory={storyHandlers.handleSelectStory}
      handleCreateStory={storyHandlers.handleCreateStory}
      handleOpenEditStory={storyHandlers.handleOpenEditStory}
      onReorderStories={storyHandlers.handleReorderStories}
      handleDocChange={handleDocChange}
    />
  );

  return (
    <>
      <AppLayout sidebar={sidebar} main={main} />

      <AppModals
        editingProject={projectHandlers.editingProject}
        onCloseEditProject={projectHandlers.handleCloseEditProject}
        onRenameProject={projectHandlers.handleRenameProject}
        onDeleteProject={projectHandlers.handleDeleteProject}
        editingStory={storyHandlers.editingStory}
        onCloseEditStory={storyHandlers.handleCloseEditStory}
        onRenameStory={storyHandlers.handleRenameStory}
        onDeleteStory={storyHandlers.handleDeleteStory}
        settingsModalOpen={settingsModalOpen}
        onCloseSettingsModal={() => setSettingsModalOpen(false)}
        wizardModalOpen={wizardModalOpen}
        onCloseWizardModal={handleCloseWizardModal}
      />
    </>
  );
};

export default App;