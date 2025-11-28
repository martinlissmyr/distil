// src/hooks/useAppInitialization.ts
import { useEffect } from 'react';
import { alineaClient, Project, StoryMeta, StoryData } from '../api/alineaClient';

type NavState = {
  appSection: 'root' | 'project' | 'story';
  rootSection: string;
  projectId: string | null;
  storyId: string | null;
  storySection: string;
};

/**
 * Parameters for the initialization hook
 */
export interface InitializationCallbacks {
  // Navigation
  loadSavedState: () => NavState | null;
  restoreState: (state: NavState) => void;
  finishInitialization: () => void;

  // CRUD
  setProjects: (projects: Project[]) => void;
  setStories: (stories: StoryMeta[]) => void;

  // Editor
  loadStory: (story: StoryData) => void;
  clearEditor: () => void;
}

/**
 * Custom hook to handle app initialization
 *
 * Handles the complex initialization sequence:
 * 1. Load projects from API
 * 2. Load saved navigation state from localStorage
 * 3. Validate and restore navigation state
 * 4. Load stories if needed
 * 5. Load story document if needed
 *
 * This runs only once on app mount.
 */
export function useAppInitialization(callbacks: InitializationCallbacks) {
  const {
    loadSavedState,
    restoreState,
    finishInitialization,
    setProjects,
    setStories,
    loadStory,
    clearEditor,
  } = callbacks;

  useEffect(() => {
    (async () => {
      try {
        const saved = loadSavedState();

        // 1. Load projects
        const projResponse = await alineaClient.listProjects();

        if (!projResponse.ok) {
          console.error('Failed to load projects:', projResponse.error);
          return;
        }

        const proj = projResponse.data;
        setProjects(proj);

        // No saved nav → default root/projects
        if (!saved) {
          restoreState({
            appSection: 'root',
            rootSection: 'projects',
            projectId: null,
            storyId: null,
            storySection: 'prose',
          });
          clearEditor();
          return;
        }

        // If we were in the root section, ignore project/story and just restore root view
        if (saved.appSection === 'root') {
          restoreState({
            appSection: 'root',
            rootSection: saved.rootSection ?? 'projects',
            projectId: null,
            storyId: null,
            storySection: 'prose',
          });
          clearEditor();
          return;
        }

        // From here: appSection is 'project' or 'story' → we need a valid project
        const projectExists = saved.projectId
          ? proj.some((p) => p.id === saved.projectId)
          : false;

        if (!projectExists) {
          restoreState({
            appSection: 'root',
            rootSection: 'projects',
            projectId: null,
            storyId: null,
            storySection: 'prose',
          });
          clearEditor();
          return;
        }

        // 2. Load stories for that project
        const listResponse = await alineaClient.listStories(saved.projectId!);
        if (!listResponse.ok) {
          console.error('Failed to load stories:', listResponse.error);
          return;
        }
        const list = listResponse.data;
        setStories(list);

        // No valid story → show project stories list
        if (!saved.storyId || !list.some((s) => s.id === saved.storyId)) {
          restoreState({
            appSection: 'project',
            rootSection: saved.rootSection ?? 'projects',
            projectId: saved.projectId,
            storyId: null,
            storySection: 'prose',
          });
          clearEditor();
          return;
        }

        // 3. Valid story → restore story view, section, and docs
        restoreState({
          appSection: 'story',
          rootSection: saved.rootSection ?? 'projects',
          projectId: saved.projectId,
          storyId: saved.storyId,
          storySection: saved.storySection ?? 'prose',
        });

        const storyResponse = await alineaClient.loadStory(
          saved.projectId!,
          saved.storyId
        );
        if (!storyResponse.ok) {
          console.error('Failed to load story:', storyResponse.error);
          return;
        }
        loadStory(storyResponse.data);

        // hydrate outline/brief if present on disk
      } finally {
        // Always re-enable navigation after initialization, regardless of success/failure
        finishInitialization();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
}
