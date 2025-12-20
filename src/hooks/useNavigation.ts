// src/hooks/useNavigation.ts
import { create } from 'zustand';
import { useEffect, useCallback, useRef } from 'react';
import type { StorySectionId, RootSectionId } from '../models/sections';

// Types
export type StorySection = StorySectionId;
export type RootSection = RootSectionId;
export type AppSection = 'root' | 'project' | 'story';

type NavState = {
  appSection: AppSection;
  rootSection: RootSection;
  projectId: string | null;
  storyId: string | null;
  storySection: StorySection;
};

type NavigationStore = NavState & {
  setAppSection: (section: AppSection) => void;
  setRootSection: (section: RootSection) => void;
  setStorySection: (section: StorySection) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedStoryId: (id: string | null) => void;
  restoreState: (state: NavState) => void;
};

const NAV_STATE_KEY = 'distil:navState:v3';

// Create Zustand store for navigation
const useNavigationStore = create<NavigationStore>((set) => ({
  appSection: 'root',
  rootSection: 'projects',
  storySection: 'prose',
  projectId: null,
  storyId: null,

  setAppSection: (appSection) => set({ appSection }),
  setRootSection: (rootSection) => set({ rootSection }),
  setStorySection: (storySection) => set({ storySection }),
  setSelectedProjectId: (projectId) => set({ projectId }),
  setSelectedStoryId: (storyId) => set({ storyId }),
  restoreState: (state) => set({
    appSection: state.appSection,
    rootSection: state.rootSection,
    projectId: state.projectId,
    storyId: state.storyId,
    storySection: state.storySection,
  }),
}));

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

export type NavigationLeaf =
  | { kind: 'root'; id: RootSection }
  | { kind: 'project'; id: 'projects' } // or ProjectSectionId if you add it later
  | { kind: 'story'; id: StorySection };

function computeLeaf(
  appSection: AppSection,
  rootSection: RootSection,
  storySection: StorySection
): NavigationLeaf {
  if (appSection === 'story') return { kind: 'story', id: storySection };
  if (appSection === 'project') return { kind: 'project', id: 'projects' };
  return { kind: 'root', id: rootSection };
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
  // Get state and setters from Zustand store
  const appSection = useNavigationStore((s) => s.appSection);
  const rootSection = useNavigationStore((s) => s.rootSection);
  const storySection = useNavigationStore((s) => s.storySection);
  const selectedProjectId = useNavigationStore((s) => s.projectId);
  const selectedStoryId = useNavigationStore((s) => s.storyId);

  const setAppSection = useNavigationStore((s) => s.setAppSection);
  const setRootSection = useNavigationStore((s) => s.setRootSection);
  const setStorySection = useNavigationStore((s) => s.setStorySection);
  const setSelectedProjectId = useNavigationStore((s) => s.setSelectedProjectId);
  const setSelectedStoryId = useNavigationStore((s) => s.setSelectedStoryId);
  const restoreStateToStore = useNavigationStore((s) => s.restoreState);
  const leaf = computeLeaf(appSection, rootSection, storySection);

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
  }, [setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToManifest = useCallback(() => {
    setAppSection('root');
    setRootSection('manifest');
    setSelectedProjectId(null);
    setSelectedStoryId(null);
  }, [setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToPlayground = useCallback(() => {
    setAppSection('root');
    setRootSection('playground');
    setSelectedProjectId(null);
    setSelectedStoryId(null);
  }, [setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToProject = useCallback((projectId: string) => {
    setAppSection('project');
    setRootSection('projects');
    setSelectedProjectId(projectId);
    setSelectedStoryId(null);
  }, [setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToStory = useCallback((
    projectId: string,
    storyId: string,
    section: StorySection = 'prose'
  ) => {
    setAppSection('story');
    setSelectedProjectId(projectId);
    setSelectedStoryId(storyId);
    setStorySection(section);
  }, [setAppSection, setSelectedProjectId, setSelectedStoryId, setStorySection]);

  const restoreStateCallback = useCallback((state: NavState) => {
    restoreStateToStore(state);
  }, [restoreStateToStore]);

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
    leaf,
    leafId: leaf.id, // convenience for getSectionConfig()

    // Actions
    goToProjects,
    goToManifest,
    goToPlayground,
    goToProject,
    goToStory,
    setStorySection,

    // Utilities (for initialization)
    loadSavedState: loadNavState,
    restoreState: restoreStateCallback,
    finishInitialization: finishInitializationCallback,
  };
}
