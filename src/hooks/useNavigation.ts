// src/hooks/useNavigation.ts
import { create } from 'zustand';
import { useEffect, useCallback } from 'react';
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

export type EditorPosition = {
  scrollTop: number;
  cursorFrom: number;
  cursorTo: number;
};

export type StorySection = StorySectionId;
export type RootSection = RootSectionId;
export type AppSection = 'root' | 'project' | 'story';

export type NavState = {
  appSection: AppSection;
  rootSection: RootSection;
  projectId: string | null;
  storyId: string | null;
  storySection: StorySection;
  currentPartIdMap: { [storyId: string]: string };
  editorPositions: { [key: string]: EditorPosition };
};

type NavigationStore = NavState & {
  isInitializing: boolean;
  setAppSection: (section: AppSection) => void;
  setRootSection: (section: RootSection) => void;
  setStorySection: (section: StorySection) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedStoryId: (id: string | null) => void;
  getCurrentPartId: (storyId: string) => string | undefined;
  setCurrentPartId: (storyId: string, partId: string | null) => void;
  saveEditorPosition: (key: string, position: EditorPosition) => void;
  getEditorPosition: (key: string) => EditorPosition | undefined;
  restoreState: (state: NavState) => void;
  finishInitialization: () => void;
};

const NAV_STATE_KEY = 'distil:navState:v4';

// Load saved state synchronously before creating store
// This ensures leafId/theme are correct from first render
function getInitialNavState(): Omit<NavState, 'currentPartIdMap'> & { currentPartIdMap: { [storyId: string]: string } } {
  try {
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    if (!raw) {
      return {
        appSection: 'root',
        rootSection: 'projects',
        storySection: 'prose',
        projectId: null,
        storyId: null,
        currentPartIdMap: {},
        editorPositions: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<NavState>;
    return {
      appSection: parsed.appSection ?? 'root',
      rootSection: parsed.rootSection ?? 'projects',
      storySection: parsed.storySection ?? 'prose',
      projectId: parsed.projectId ?? null,
      storyId: parsed.storyId ?? null,
      currentPartIdMap: parsed.currentPartIdMap ?? {},
      editorPositions: parsed.editorPositions ?? {},
    };
  } catch {
    return {
      appSection: 'root',
      rootSection: 'projects',
      storySection: 'prose',
      projectId: null,
      storyId: null,
      currentPartIdMap: {},
      editorPositions: {},
    };
  }
}

const initialNavState = getInitialNavState();

const omitStoryId = (map: { [storyId: string]: string }, storyId: string) =>
  Object.fromEntries(Object.entries(map).filter(([id]) => id !== storyId));

const useNavigationStore = create<NavigationStore>((set, get) => ({
  ...initialNavState,
  isInitializing: true,

  setAppSection: (appSection) => set({ appSection }),
  setRootSection: (rootSection) => set({ rootSection }),
  setStorySection: (storySection) => set({ storySection }),
  setSelectedProjectId: (projectId) => set({ projectId }),
  setSelectedStoryId: (storyId) => set({ storyId }),
  getCurrentPartId: (storyId) => get().currentPartIdMap[storyId],
  setCurrentPartId: (storyId, partId) => {
    const currentMap = get().currentPartIdMap;
    if (partId === null) {
      // Remove entry if partId is null
      const rest = omitStoryId(currentMap, storyId);
      set({ currentPartIdMap: rest });
    } else {
      // Add or update entry
      set({ currentPartIdMap: { ...currentMap, [storyId]: partId } });
    }
  },
  saveEditorPosition: (key, position) => {
    set((state) => {
      const current = state.editorPositions?.[key];
      if (
        current &&
        current.scrollTop === position.scrollTop &&
        current.cursorFrom === position.cursorFrom &&
        current.cursorTo === position.cursorTo
      ) {
        return state;
      }

      return {
        editorPositions: {
          ...(state.editorPositions || {}),
          [key]: position,
        },
      };
    });
  },
  getEditorPosition: (key) => get().editorPositions?.[key],
  restoreState: (state) =>
    set({
      appSection: state.appSection,
      rootSection: state.rootSection,
      projectId: state.projectId,
      storyId: state.storyId,
      storySection: state.storySection,
      currentPartIdMap: state.currentPartIdMap,
      editorPositions: state.editorPositions || {},
    }),
  finishInitialization: () => set({ isInitializing: false }),
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
      currentPartIdMap: parsed.currentPartIdMap ?? {},
      editorPositions: parsed.editorPositions ?? {},
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
  const currentPartIdMap = useNavigationStore((s) => s.currentPartIdMap);
  const isInitializing = useNavigationStore((s) => s.isInitializing);

  const setAppSection = useNavigationStore((s) => s.setAppSection);
  const setRootSection = useNavigationStore((s) => s.setRootSection);
  const setStorySection = useNavigationStore((s) => s.setStorySection);
  const setSelectedProjectId = useNavigationStore((s) => s.setSelectedProjectId);
  const setSelectedStoryId = useNavigationStore((s) => s.setSelectedStoryId);
  const getCurrentPartId = useNavigationStore((s) => s.getCurrentPartId);
  const setCurrentPartId = useNavigationStore((s) => s.setCurrentPartId);
  const saveEditorPosition = useNavigationStore((s) => s.saveEditorPosition);
  const getEditorPosition = useNavigationStore((s) => s.getEditorPosition);
  const restoreStateToStore = useNavigationStore((s) => s.restoreState);
  const finishInitializationInStore = useNavigationStore((s) => s.finishInitialization);

  // NEW: single guard entrypoint
  const requestNavigate = useLeaveGuardStore((s) => s.requestNavigate);

  const leaf = computeLeaf(appSection, rootSection, storySection);

  const editorPositions = useNavigationStore((s) => s.editorPositions);

  useEffect(() => {
    if (isInitializing) return;

    const nav: NavState = {
      appSection,
      rootSection,
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storySection,
      currentPartIdMap,
      editorPositions,
    };
    saveNavState(nav);
  }, [appSection, rootSection, selectedProjectId, selectedStoryId, storySection, currentPartIdMap, editorPositions, isInitializing]);

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
    finishInitializationInStore();
  }, [finishInitializationInStore]);

  return {
    appSection,
    rootSection,
    storySection,
    selectedProjectId,
    selectedStoryId,
    currentPartIdMap,
    isInitializing,
    leaf,
    leafId: leaf.id,

    goToProjects,
    goToManifest,
    goToPlayground,
    goToProject,
    goToStory,
    setStorySection: guardedSetStorySection,
    getCurrentPartId,
    setCurrentPartId,
    saveEditorPosition,
    getEditorPosition,

    loadSavedState: loadNavState,
    restoreState: restoreStateCallback,
    finishInitialization: finishInitializationCallback,
  };
}
