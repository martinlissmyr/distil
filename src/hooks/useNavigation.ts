// src/hooks/useNavigation.ts
import { useState, useEffect, useCallback, useRef } from 'react';

// Types
export type StorySection = 'prose' | 'outline' | 'brief' | 'characters' | 'locations';
export type RootSection = 'projects' | 'manifest';
export type AppSection = 'root' | 'project' | 'story';

type NavState = {
  appSection: AppSection;
  rootSection: RootSection;
  projectId: string | null;
  storyId: string | null;
  storySection: StorySection;
};

const NAV_STATE_KEY = 'alinea:navState:v3';

// Helper functions for localStorage persistence
function loadNavState(): NavState | null {
  try {
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NavState>;

    return {
      appSection: parsed.appSection ?? 'root',
      rootSection: parsed.rootSection ?? 'projects',
      projectId: parsed.projectId ?? null,
      storyId: parsed.storyId ?? null,
      storySection: parsed.storySection ?? 'prose',
    };
  } catch {
    return null;
  }
}

function saveNavState(state: NavState) {
  try {
    window.localStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore; localStorage might be unavailable
  }
}

/**
 * Custom hook to manage application navigation state and localStorage persistence
 *
 * Handles navigation between:
 * - Root sections (projects, manifest)
 * - Project view (list of stories)
 * - Story view (prose, outline, brief, etc.)
 */
export function useNavigation() {
  // Navigation state
  const [appSection, setAppSection] = useState<AppSection>('root');
  const [rootSection, setRootSection] = useState<RootSection>('projects');
  const [storySection, setStorySection] = useState<StorySection>('prose');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  // Track if we're in the initialization phase (don't persist during restoration)
  const isInitializing = useRef(true);

  // Persist navigation state to localStorage whenever it changes (after initialization)
  useEffect(() => {
    // Skip persistence during initial mount/restoration
    if (isInitializing.current) {
      return;
    }

    const nav: NavState = {
      appSection,
      rootSection,
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storySection,
    };
    saveNavState(nav);
  }, [appSection, rootSection, selectedProjectId, selectedStoryId, storySection]);

  // Navigation actions
  const goToProjects = useCallback(() => {
    setAppSection('root');
    setRootSection('projects');
    setSelectedProjectId(null);
    setSelectedStoryId(null);
  }, []);

  const goToManifest = useCallback(() => {
    setAppSection('root');
    setRootSection('manifest');
    setSelectedProjectId(null);
    setSelectedStoryId(null);
  }, []);

  const goToProject = useCallback((projectId: string) => {
    setAppSection('project');
    setRootSection('projects');
    setSelectedProjectId(projectId);
    setSelectedStoryId(null);
  }, []);

  const goToStory = useCallback((
    projectId: string,
    storyId: string,
    section: StorySection = 'prose'
  ) => {
    setAppSection('story');
    setSelectedProjectId(projectId);
    setSelectedStoryId(storyId);
    setStorySection(section);
  }, []);

  const restoreStateCallback = useCallback((state: NavState) => {
    setAppSection(state.appSection);
    setRootSection(state.rootSection);
    setSelectedProjectId(state.projectId);
    setSelectedStoryId(state.storyId);
    setStorySection(state.storySection);
  }, []);

  const finishInitializationCallback = useCallback(() => {
    // Re-enable persistence after initialization is complete
    isInitializing.current = false;
  }, []);

  return {
    // State
    appSection,
    rootSection,
    storySection,
    selectedProjectId,
    selectedStoryId,

    // Actions
    goToProjects,
    goToManifest,
    goToProject,
    goToStory,
    setStorySection,

    // Utilities (for initialization)
    loadSavedState: loadNavState,
    restoreState: restoreStateCallback,
    finishInitialization: finishInitializationCallback,
  };
}
