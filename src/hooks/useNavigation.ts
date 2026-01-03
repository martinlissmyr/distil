// src/hooks/useNavigation.ts
import { create } from 'zustand';
import { useEffect, useCallback, useRef } from 'react';
import type { StorySectionId, RootSectionId } from '../models/sections';

// -------------------------
// Leave guard store
// -------------------------
type ConfirmLeaveFn = (args: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) => Promise<boolean>;

type LeaveGuardStore = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;

  // Optional custom confirm (Mantine modal, etc.)
  confirmLeave?: ConfirmLeaveFn;
  setConfirmLeave: (fn: ConfirmLeaveFn | undefined) => void;

  requestNavigate: (next: () => void) => void;
};

export const useLeaveGuardStore = create<LeaveGuardStore>((set, get) => ({
  isDirty: false,
  setDirty: (isDirty) => set({ isDirty }),

  confirmLeave: undefined,
  setConfirmLeave: (fn) => set({ confirmLeave: fn }),

  requestNavigate: (next) => {
    const { isDirty, confirmLeave } = get();
    if (!isDirty) {
      next();
      return;
    }

    // async confirm wrapper
    void (async () => {
      let ok = false;

      if (confirmLeave) {
        ok = await confirmLeave({
          title: 'Discard changes?',
          message: 'You have unsaved changes. Leave and discard changes?',
          confirmLabel: 'Discard changes',
          cancelLabel: 'Cancel',
        });
      } else {
        ok = window.confirm('You have unsaved changes. If you leave now, those changes will be lost.');
      }

      if (ok) {
        // reset dirty before navigating
        set({ isDirty: false });
        next();
      }
    })();
  },
}));

// -------------------------
// navigation store
// -------------------------

export type StorySection = StorySectionId;
export type RootSection = RootSectionId;
export type AppSection = 'root' | 'project' | 'story';

export type NavState = {
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
  restoreState: (state) =>
    set({
      appSection: state.appSection,
      rootSection: state.rootSection,
      projectId: state.projectId,
      storyId: state.storyId,
      storySection: state.storySection,
    }),
}));

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
    // ignore
  }
}

export type NavigationLeaf =
  | { kind: 'root'; id: RootSection }
  | { kind: 'project'; id: 'projects' }
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

export function useNavigation() {
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

  // NEW: single guard entrypoint
  const requestNavigate = useLeaveGuardStore((s) => s.requestNavigate);

  const leaf = computeLeaf(appSection, rootSection, storySection);
  const isInitializing = useRef(true);

  useEffect(() => {
    if (isInitializing.current) return;

    const nav: NavState = {
      appSection,
      rootSection,
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storySection,
    };
    saveNavState(nav);
  }, [appSection, rootSection, selectedProjectId, selectedStoryId, storySection]);

  // Wrap ALL actions with requestNavigate
  const goToProjects = useCallback(() => {
    requestNavigate(() => {
      setAppSection('root');
      setRootSection('projects');
      setSelectedProjectId(null);
      setSelectedStoryId(null);
    });
  }, [requestNavigate, setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToManifest = useCallback(() => {
    requestNavigate(() => {
      setAppSection('root');
      setRootSection('manifest');
      setSelectedProjectId(null);
      setSelectedStoryId(null);
    });
  }, [requestNavigate, setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToPlayground = useCallback(() => {
    requestNavigate(() => {
      setAppSection('root');
      setRootSection('playground');
      setSelectedProjectId(null);
      setSelectedStoryId(null);
    });
  }, [requestNavigate, setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]);

  const goToProject = useCallback(
    (projectId: string) => {
      requestNavigate(() => {
        setAppSection('project');
        setRootSection('projects');
        setSelectedProjectId(projectId);
        setSelectedStoryId(null);
      });
    },
    [requestNavigate, setAppSection, setRootSection, setSelectedProjectId, setSelectedStoryId]
  );

  const goToStory = useCallback(
    (projectId: string, storyId: string, section: StorySection = 'prose') => {
      requestNavigate(() => {
        setAppSection('story');
        setSelectedProjectId(projectId);
        setSelectedStoryId(storyId);
        setStorySection(section);
      });
    },
    [requestNavigate, setAppSection, setSelectedProjectId, setSelectedStoryId, setStorySection]
  );

  const guardedSetStorySection = useCallback(
    (section: StorySection) => {
      requestNavigate(() => {
        setStorySection(section);
      });
    },
    [requestNavigate, setStorySection]
  );

  const restoreStateCallback = useCallback(
    (state: NavState) => {
      restoreStateToStore(state);
    },
    [restoreStateToStore]
  );

  const finishInitializationCallback = useCallback(() => {
    isInitializing.current = false;
  }, []);

  return {
    appSection,
    rootSection,
    storySection,
    selectedProjectId,
    selectedStoryId,
    leaf,
    leafId: leaf.id,

    goToProjects,
    goToManifest,
    goToPlayground,
    goToProject,
    goToStory,
    setStorySection: guardedSetStorySection,

    loadSavedState: loadNavState,
    restoreState: restoreStateCallback,
    finishInitialization: finishInitializationCallback,
  };
}