// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';
import './styles/App.scss';

import {
  client,
  type IpcResponse,
  Project,
  StoryMeta,
} from './api/client';
import { useAppStore } from './state/useAppStore';
import { AppLayout } from './ui/layout/AppLayout';
import { Sidebar } from './ui/layout/Sidebar';
import { AppContent } from './ui/layout/AppContent';
import { AppModals } from './ui/layout/AppModals';
import { LoadingSplash } from './ui/common/LoadingSplash';
import { useNavigation, useLeaveGuardStore } from './hooks/useNavigation';
import { useEntityCRUD } from './hooks/useEntityCRUD';
import { useStoryEditor } from './hooks/useStoryEditor';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useProjectHandlers } from './hooks/useProjectHandlers';
import { useStoryHandlers } from './hooks/useStoryHandlers';
import { projectionService } from './services/ProjectionGenerationService';

const App: React.FC = () => {
  const ensureMetaDocsLoaded = useAppStore((s) => s.ensureMetaDocsLoaded);

  // Preload manifest on app start
  useEffect(() => {
    void ensureMetaDocsLoaded({ scope: 'root' }, ['manifest']);
  }, [ensureMetaDocsLoaded]);

  // Start projection generation service
  useEffect(() => {
    projectionService.start();
    return () => {
      projectionService.stop();
    };
  }, []);

  // Generate projection when navigating away from a part
  useEffect(() => {
    let previousPartIdMap: { [storyId: string]: string } = {};

    const unsubscribe = useAppStore.subscribe(() => {
      const state = useAppStore.getState();
      const currentPartIdMap = state.currentPartIdMap;
      const metadata = state.currentStoryMetadata;

      // When part ID changes for any story, generate projection for the OLD part
      if (metadata) {
        const storyId = metadata.id;
        const currentPartId = currentPartIdMap[storyId];
        const previousPartId = previousPartIdMap[storyId];

        if (previousPartId && previousPartId !== currentPartId) {
          // Get projectId from navigation state
          const navState = localStorage.getItem('Distil:navState:v4');
          if (navState) {
            try {
              const parsed = JSON.parse(navState);
              if (parsed.projectId) {
                console.log(`[App] Triggering projection generation for part ${previousPartId} in story ${storyId} (navigated away)`);
                projectionService.generateForPart(parsed.projectId, storyId, previousPartId);
              }
            } catch (err) {
              console.error('Failed to parse navigation state:', err);
            }
          }
        }
      }

      previousPartIdMap = { ...currentPartIdMap };
    });

    return unsubscribe;
  }, []); // Empty dependency array - subscribe once on mount

  // Navigation hook
  const navigation = useNavigation();
  const {
    appSection,
    rootSection,
    storySection,
    selectedProjectId,
    selectedStoryId,
    isInitializing,
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
        return Promise.resolve({ ok: true, data: [] as StoryMeta[] } satisfies IpcResponse<StoryMeta[]>);
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
    delete: async (storyId) => {
      if (!selectedProjectId) {
        return { ok: false, error: 'No project selected' };
      }
      const response = await client.deleteStory(selectedProjectId, storyId);
      if (!response.ok) {
        return response; // Return error response
      }
      // Refresh the stories list after deletion
      const listResponse = await client.listStories(selectedProjectId);
      if (listResponse.ok) {
        storiesCRUD.setItems(listResponse.data);
      }
      return { ok: true, data: undefined };
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

      // Load story metadata
      const metadataResponse = await client.loadStoryMetadata(selectedProjectId, created.id);
      if (!metadataResponse.ok) {
        console.error('Failed to load story metadata:', metadataResponse.error);
        return;
      }

      const metadata = metadataResponse.data;

      // Load the first part's document (or use empty if no parts)
      let partDoc: JSONContent;
      if (metadata.parts.length > 0) {
        const firstPart = metadata.parts[0];
        const partResponse = await client.loadPartDoc(selectedProjectId, created.id, firstPart.id);
        if (!partResponse.ok) {
          console.error('Failed to load part document:', partResponse.error);
          return;
        }
        partDoc = partResponse.data.doc;
      } else {
        partDoc = { type: 'doc', content: [] };
      }

      loadStory({
        title: metadata.title,
        doc: partDoc,
      });
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
  const { currentTitle, currentDoc, loadStory, clearEditor, updateDoc, setCurrentTitle } = storyEditor;

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
  const activeWizard = useAppStore((s) => s.activeWizard);
  const wizardModalOpen = !!activeWizard;

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'loading' | 'converting' | 'saving' | 'complete' | 'error'>('loading');
  const [exportFormat, setExportFormat] = useState<'docx' | 'pdf'>('docx');
  const [exportError, setExportError] = useState<string>();

  // Leave guard modal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveModalProps, setLeaveModalProps] = useState<{
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({ message: '', onConfirm: () => {}, onCancel: () => {} });

  // Update menu context when navigation changes
  useEffect(() => {
    const isStoryContext = appSection === 'story';
    window.menu.updateContext({
      isStoryContext,
      projectId: selectedProjectId || undefined,
      storyId: selectedStoryId || undefined,
    });
  }, [appSection, selectedProjectId, selectedStoryId]);

  // Handle export from menu
  useEffect(() => {
    const handleExport = async (format: 'docx' | 'pdf') => {
      if (!selectedProjectId || !selectedStoryId) {
        console.error('[Export] No project or story selected');
        return;
      }

      setExportFormat(format);
      setExportModalOpen(true);
      setExportStatus('loading');
      setExportError(undefined);

      const { exportStory } = await import('./export/exportOrchestrator');

      await exportStory(selectedProjectId, selectedStoryId, format, (progress) => {
        setExportStatus(progress.status);
        if (progress.errorMessage) {
          setExportError(progress.errorMessage);
        }

        // Auto-close on complete after brief delay
        if (progress.status === 'complete') {
          setTimeout(() => {
            setExportModalOpen(false);
          }, 1500);
        }
      });
    };

    // Register the handler
    const cleanup = window.menu.onExport(handleExport);

    // Cleanup function to remove the listener
    return () => {
      if (cleanup) cleanup();
    };
  }, [selectedProjectId, selectedStoryId]);

  const handleCloseWizardModal = () => {
    const { closeWizard } = useAppStore.getState();
    closeWizard(false);
  };

  // Register leave guard confirm function
  const setConfirmLeave = useLeaveGuardStore((s) => s.setConfirmLeave);
  useEffect(() => {
    setConfirmLeave((args) => {
      return new Promise<boolean>((resolve) => {
        setLeaveModalProps({
          title: args.title,
          message: args.message,
          confirmLabel: args.confirmLabel,
          cancelLabel: args.cancelLabel,
          onConfirm: () => {
            setLeaveModalOpen(false);
            resolve(true);
          },
          onCancel: () => {
            setLeaveModalOpen(false);
            resolve(false);
          },
        });
        setLeaveModalOpen(true);
      });
    });

    return () => {
      setConfirmLeave(undefined);
    };
  }, [setConfirmLeave]);

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

  // Listen for project navigation from main process (e.g., when opening .distilproject files)
  useEffect(() => {
    const handleNavigateToProject = async (projectId: string) => {
      await projectHandlers.handleSelectProject(projectId);
    };

    const cleanup = window.menu.onNavigateToProject(handleNavigateToProject);
    return () => {
      if (cleanup) cleanup();
    };
  }, [projectHandlers]);

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
  const handleDocChange = useCallback((doc: JSONContent) => {
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

  // Show loading splash during initialization
  if (isInitializing) {
    return <LoadingSplash />;
  }

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

        creatingProject={projectHandlers.creatingProject}
        onCloseCreateProject={projectHandlers.handleCloseCreateProject}
        onConfirmCreateProject={projectHandlers.handleConfirmCreateProject}

        creatingStory={storyHandlers.creatingStory}
        onCloseCreateStory={storyHandlers.handleCloseCreateStory}
        onConfirmCreateStory={storyHandlers.handleConfirmCreateStory}

        settingsModalOpen={settingsModalOpen}
        onCloseSettingsModal={() => setSettingsModalOpen(false)}

        wizardModalOpen={wizardModalOpen}
        onCloseWizardModal={handleCloseWizardModal}

        leaveGuardModalOpen={leaveModalOpen}
        leaveGuardTitle={leaveModalProps.title}
        leaveGuardMessage={leaveModalProps.message}
        leaveGuardConfirmLabel={leaveModalProps.confirmLabel}
        leaveGuardCancelLabel={leaveModalProps.cancelLabel}
        onLeaveGuardConfirm={leaveModalProps.onConfirm}
        onLeaveGuardCancel={leaveModalProps.onCancel}

        exportModalOpen={exportModalOpen}
        onCloseExportModal={() => setExportModalOpen(false)}
        exportStatus={exportStatus}
        exportFormat={exportFormat}
        exportError={exportError}
      />
    </>
  );
};

export default App;
