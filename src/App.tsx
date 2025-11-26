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
import { AlineaLayout } from './components/layout/AlineaLayout';
import { Sidebar } from './components/layout/Sidebar';
import type { ProseDoc } from './components/editor/ProseEditor';
import type { MetaDoc } from './components/editor/MetaTextEditor';
import { ManifestView } from './components/manifest/ManifestView';
import { ProjectsView } from './components/projects/ProjectsView';
import { StoriesView } from './components/stories/StoriesView';
import { StoryTextView } from './components/stories/StoryTextView';
import { useSystemTheme } from './hooks/useSystemTheme';
import { EntityEditModal } from './components/common/EntityEditModal';
import { StoryOutlineView } from './components/stories/StoryOutlineView';
import { StoryBriefView } from './components/stories/StoryBriefView';

// ---------------
// Types
type StorySection = 'prose' | 'outline' | 'brief' | 'characters' | 'locations';
type RootSection = 'projects' | 'manifest' | 'assistant';
type AppSection = 'root' | 'project' | 'story';

const NAV_STATE_KEY = 'alinea:navState:v3';

type NavState = {
  appSection: AppSection;
  rootSection: RootSection;
  projectId: string | null;
  storyId: string | null;
  storySection: StorySection;
};

type EditingProjectState = {
  id: string;
  name: string;
} | null;

type EditingStoryState = {
  id: string;
  title: string;
} | null;

// ---------- nav state helpers ----------
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

const App: React.FC = () => {
  // High-level navigation
  const [appSection, setAppSection] = useState<AppSection>('root');
  const [rootSection, setRootSection] = useState<RootSection>('projects');
  const [storySection, setStorySection] = useState<StorySection>('prose');

  // Entities
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [stories, setStories] = useState<StoryMeta[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  // Story editor state (prose)
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentDoc, setCurrentDoc] = useState<ProseDoc | null>(null);
  const [dirty, setDirty] = useState(false);

  // Manifest state
  const [manifestDoc, setManifestDoc] = useState<MetaDoc | null>(null);
  const [manifestDirty, setManifestDirty] = useState(false);

  // Outline state
  const [outlineDoc, setOutlineDoc] = useState<MetaDoc | null>(null);
  const [outlineDirty, setOutlineDirty] = useState(false);

  // Brief state
  const [briefDoc, setBriefDoc] = useState<MetaDoc | null>(null);
  const [briefDirty, setBriefDirty] = useState(false);

  // Edit modals
  const [editingProject, setEditingProject] = useState<EditingProjectState>(null);
  const [editingStory, setEditingStory] = useState<EditingStoryState>(null);

  const systemTheme = useSystemTheme();

  // ---- Theme attribute for Mantine ----
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mantine-color-scheme',
      systemTheme
    );
  }, [systemTheme]);

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

  // ---- Initial load: projects + manifest + nav state (+ optional story & docs) ----
  useEffect(() => {
    (async () => {
      const saved = loadNavState();

      // 1. Load projects + manifest in parallel
      const [proj, manifestMaybe] = await Promise.all([
        alineaClient.listProjects(),
        (async () => {
          try {
            const manifest = await alineaClient.loadManifest();
            return manifest.doc;
          } catch (e) {
            console.error('Failed to load manifest', e);
            return null;
          }
        })(),
      ]);

      setProjects(proj);
      if (manifestMaybe) {
        setManifestDoc(manifestMaybe);
        setManifestDirty(false);
      }

      // No saved nav → default root/projects
      if (!saved) {
        setAppSection('root');
        setRootSection('projects');
        setSelectedProjectId(null);
        setSelectedStoryId(null);
        setStorySection('prose');
        setCurrentDoc(null);
        setCurrentTitle('');
        setDirty(false);
        setOutlineDoc(null);
        setOutlineDirty(false);
        setBriefDoc(null);
        setBriefDirty(false);
        return;
      }

      // If we were in the root section, ignore project/story and just restore root view
      if (saved.appSection === 'root') {
        setAppSection('root');
        setRootSection(saved.rootSection ?? 'projects');
        setSelectedProjectId(null);
        setSelectedStoryId(null);
        setStorySection('prose');
        setCurrentDoc(null);
        setCurrentTitle('');
        setDirty(false);
        setOutlineDoc(null);
        setOutlineDirty(false);
        setBriefDoc(null);
        setBriefDirty(false);
        return;
      }

      // From here: appSection is 'project' or 'story' → we need a valid project
      const projectExists = saved.projectId
        ? proj.some((p) => p.id === saved.projectId)
        : false;

      if (!projectExists) {
        setAppSection('root');
        setRootSection('projects');
        setSelectedProjectId(null);
        setSelectedStoryId(null);
        setStorySection('prose');
        setCurrentDoc(null);
        setCurrentTitle('');
        setDirty(false);
        setOutlineDoc(null);
        setOutlineDirty(false);
        setBriefDoc(null);
        setBriefDirty(false);
        return;
      }

      setSelectedProjectId(saved.projectId!);
      setRootSection(saved.rootSection ?? 'projects');

      // 2. Load stories for that project
      const list = await alineaClient.listStories(saved.projectId!);
      setStories(list);

      // No valid story → show project stories list
      if (!saved.storyId || !list.some((s) => s.id === saved.storyId)) {
        setSelectedStoryId(null);
        setAppSection('project');
        setStorySection('prose');
        setCurrentDoc(null);
        setCurrentTitle('');
        setDirty(false);
        setOutlineDoc(null);
        setOutlineDirty(false);
        setBriefDoc(null);
        setBriefDirty(false);
        return;
      }

      // 3. Valid story → restore story view, section, and docs
      setSelectedStoryId(saved.storyId);
      setAppSection('story');
      setStorySection(saved.storySection ?? 'prose');

      const story: StoryData = await alineaClient.loadStory(
        saved.projectId!,
        saved.storyId
      );
      setCurrentTitle(story.title);
      setCurrentDoc(story.doc);
      setDirty(false);

      // hydrate outline/brief if present on disk
      setOutlineDoc((story as any).outlineDoc ?? null);
      setOutlineDirty(false);
      setBriefDoc((story as any).briefDoc ?? null);
      setBriefDirty(false);
    })();
  }, []);

  // ---- Persist nav on changes ----
  useEffect(() => {
    const nav: NavState = {
      appSection,
      rootSection,
      projectId: selectedProjectId,
      storyId: selectedStoryId,
      storySection,
    };
    saveNavState(nav);
  }, [appSection, rootSection, selectedProjectId, selectedStoryId, storySection]);

  // ---- Handlers ----
  const handleDocChange = useCallback((doc: ProseDoc) => {
    setCurrentDoc(doc);
    setDirty(true);
  }, []);

  const handleManifestChange = useCallback((doc: MetaDoc) => {
    setManifestDoc(doc);
    setManifestDirty(true);
  }, []);

  const handleOutlineChange = useCallback((doc: MetaDoc) => {
    setOutlineDoc(doc);
    setOutlineDirty(true);
  }, []);

  const handleBriefChange = useCallback((doc: MetaDoc) => {
    setBriefDoc(doc);
    setBriefDirty(true);
  }, []);

  const handleSelectRootSection = (section: RootSection) => {
    setRootSection(section);
    setAppSection('root');

    if (section !== 'projects') {
      setSelectedProjectId(null);
      setSelectedStoryId(null);
      setStories([]);
      setCurrentDoc(null);
      setCurrentTitle('');
      setDirty(false);
      setOutlineDoc(null);
      setOutlineDirty(false);
      setBriefDoc(null);
      setBriefDirty(false);
    }
  };

  // ---- Project actions ----
  const handleCreateProject = async () => {
    const created = await alineaClient.createProject('New project');
    const updated = await alineaClient.listProjects();
    setProjects(updated);
    setSelectedProjectId(created.id);
    setSelectedStoryId(null);
    setCurrentDoc(null);
    setCurrentTitle('');
    setDirty(false);
    setOutlineDoc(null);
    setOutlineDirty(false);
    setBriefDoc(null);
    setBriefDirty(false);
    setRootSection('projects');
    setAppSection('project');

    const list = await alineaClient.listStories(created.id);
    setStories(list);
  };

  const handleSelectProject = async (id: string) => {
    setRootSection('projects');
    setSelectedProjectId(id);
    setSelectedStoryId(null);
    setCurrentDoc(null);
    setCurrentTitle('');
    setDirty(false);
    setOutlineDoc(null);
    setOutlineDirty(false);
    setBriefDoc(null);
    setBriefDirty(false);
    setAppSection('project');

    const list = await alineaClient.listStories(id);
    setStories(list);
  };

  const handleBackToProjects = () => {
    setAppSection('root');
    setRootSection('projects');
    setSelectedProjectId(null);
    setStories([]);
    setSelectedStoryId(null);
    setCurrentDoc(null);
    setCurrentTitle('');
    setDirty(false);
    setOutlineDoc(null);
    setOutlineDirty(false);
    setBriefDoc(null);
    setBriefDirty(false);
  };

  const handleReorderProjects = async (ids: string[]) => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const reordered = ids.map((id) => byId.get(id)!).filter(Boolean);
    setProjects(reordered);
    await alineaClient.reorderProjects(ids);
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

    await alineaClient.updateProject(editingProject.id, { name: trimmed });
    const updated = await alineaClient.listProjects();
    setProjects(updated);

    setEditingProject(null);
  };

  const handleDeleteProject = async () => {
    if (!editingProject) return;

    await alineaClient.deleteProject(editingProject.id);
    const updated = await alineaClient.listProjects();
    setProjects(updated);

    if (selectedProjectId === editingProject.id) {
      setAppSection('root');
      setRootSection('projects');
      setSelectedProjectId(null);
      setStories([]);
      setSelectedStoryId(null);
      setCurrentDoc(null);
      setCurrentTitle('');
      setDirty(false);
      setOutlineDoc(null);
      setOutlineDirty(false);
      setBriefDoc(null);
      setBriefDirty(false);
    }

    setEditingProject(null);
  };

  // ---- Story actions ----
  const handleCreateStory = async () => {
    if (!selectedProjectId) return;
    const title = `Untitled ${stories.length + 1}`;
    const created = await alineaClient.createStory(selectedProjectId, title);
    const updated = await alineaClient.listStories(selectedProjectId);
    setStories(updated);
    setSelectedStoryId(created.id);
    setAppSection('story');
    setStorySection('prose');

    const story: StoryData = await alineaClient.loadStory(
      selectedProjectId,
      created.id
    );
    setCurrentTitle(story.title);
    setCurrentDoc(story.doc);
    setDirty(false);
    setOutlineDoc((story as any).outlineDoc ?? null);
    setOutlineDirty(false);
    setBriefDoc((story as any).briefDoc ?? null);
    setBriefDirty(false);
  };

  const handleSelectStory = async (id: string) => {
    if (!selectedProjectId) return;
    setSelectedStoryId(id);
    setStorySection('prose');
    setAppSection('story');

    const story: StoryData = await alineaClient.loadStory(selectedProjectId, id);
    setCurrentTitle(story.title);
    setCurrentDoc(story.doc);
    setDirty(false);
    setOutlineDoc((story as any).outlineDoc ?? null);
    setOutlineDirty(false);
    setBriefDoc((story as any).briefDoc ?? null);
    setBriefDirty(false);
  };

  const handleBackToProjectFromStory = () => {
    setAppSection('project');
    setSelectedStoryId(null);
    setStorySection('prose');
    setCurrentDoc(null);
    setCurrentTitle('');
    setDirty(false);
    setOutlineDoc(null);
    setOutlineDirty(false);
    setBriefDoc(null);
    setBriefDirty(false);
  };

  const handleReorderStories = async (ids: string[]) => {
    if (!selectedProjectId) return;
    const byId = new Map(stories.map((s) => [s.id, s]));
    const reordered = ids.map((id) => byId.get(id)!).filter(Boolean);
    setStories(reordered);
    await alineaClient.reorderStories(selectedProjectId, ids);
  };

  const handleSave = async () => {
    if (!selectedProjectId || !selectedStoryId || !currentDoc) return;
    await alineaClient.saveStory(selectedProjectId, selectedStoryId, {
      id: selectedStoryId,
      title: currentTitle || 'Untitled',
      doc: currentDoc,
      outlineDoc: outlineDoc ?? undefined,
      briefDoc: briefDoc ?? undefined,
    });
    setDirty(false);
    setOutlineDirty(false);
    setBriefDirty(false);
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

    await alineaClient.updateStory(selectedProjectId, editingStory.id, {
      title: trimmed,
    });

    const updatedStories = await alineaClient.listStories(selectedProjectId);
    setStories(updatedStories);

    if (selectedStoryId === editingStory.id) {
      setCurrentTitle(trimmed);
    }

    setEditingStory(null);
  };

  const handleDeleteStory = async () => {
    if (!editingStory || !selectedProjectId) return;

    await alineaClient.deleteStory(selectedProjectId, editingStory.id);

    const updatedStories = await alineaClient.listStories(selectedProjectId);
    setStories(updatedStories);

    if (selectedStoryId === editingStory.id) {
      setAppSection('project');
      setSelectedStoryId(null);
      setStorySection('prose');
      setCurrentDoc(null);
      setCurrentTitle('');
      setDirty(false);
      setOutlineDoc(null);
      setOutlineDirty(false);
      setBriefDoc(null);
      setBriefDirty(false);
    }

    setEditingStory(null);
  };

  // ---- Autosave story (prose) ----
  useEffect(() => {
    if (!dirty || !currentDoc || !selectedProjectId || !selectedStoryId) return;

    const timeout = setTimeout(() => {
      (async () => {
        try {
          await alineaClient.saveStory(selectedProjectId, selectedStoryId, {
            id: selectedStoryId,
            title: currentTitle || 'Untitled',
            doc: currentDoc,
            outlineDoc: outlineDoc ?? undefined,
            briefDoc: briefDoc ?? undefined,
          });
          setDirty(false);
        } catch (e) {
          console.error('Autosave failed', e);
        }
      })();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    dirty,
    currentDoc,
    currentTitle,
    selectedProjectId,
    selectedStoryId,
    outlineDoc,
    briefDoc,
  ]);

  // ---- Autosave outline ----
  useEffect(() => {
    if (!outlineDirty || !outlineDoc || !selectedProjectId || !selectedStoryId) {
      return;
    }

    const timeout = setTimeout(() => {
      (async () => {
        try {
          await alineaClient.saveStory(selectedProjectId, selectedStoryId, {
            id: selectedStoryId,
            title: currentTitle || 'Untitled',
            doc:
              currentDoc ??
              ({
                type: 'doc',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: '' }] },
                ],
              } as ProseDoc),
            outlineDoc: outlineDoc ?? undefined,
            briefDoc: briefDoc ?? undefined,
          });
          setOutlineDirty(false);
        } catch (e) {
          console.error('Outline autosave failed', e);
        }
      })();
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    outlineDirty,
    outlineDoc,
    briefDoc,
    currentDoc,
    currentTitle,
    selectedProjectId,
    selectedStoryId,
  ]);

  // ---- Autosave brief ----
  useEffect(() => {
    if (!briefDirty || !briefDoc || !selectedProjectId || !selectedStoryId) {
      return;
    }

    const timeout = setTimeout(() => {
      (async () => {
        try {
          await alineaClient.saveStory(selectedProjectId, selectedStoryId, {
            id: selectedStoryId,
            title: currentTitle || 'Untitled',
            doc:
              currentDoc ??
              ({
                type: 'doc',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: '' }] },
                ],
              } as ProseDoc),
            outlineDoc: outlineDoc ?? undefined,
            briefDoc: briefDoc ?? undefined,
          });
          setBriefDirty(false);
        } catch (e) {
          console.error('Brief autosave failed', e);
        }
      })();
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    briefDirty,
    briefDoc,
    outlineDoc,
    currentDoc,
    currentTitle,
    selectedProjectId,
    selectedStoryId,
  ]);

  // ---- Autosave manifest ----
  useEffect(() => {
    if (!manifestDirty || !manifestDoc) return;

    const timeout = setTimeout(() => {
      (async () => {
        try {
          await alineaClient.saveManifest({ doc: manifestDoc });
          setManifestDirty(false);
        } catch (e) {
          console.error('Manifest autosave failed', e);
        }
      })();
    }, 800);

    return () => clearTimeout(timeout);
  }, [manifestDirty, manifestDoc]);

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
      <ManifestView doc={manifestDoc} onChange={handleManifestChange} />
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
          storyId={selectedStoryId ?? 'no-story'}
          doc={currentDoc}
          onChange={handleDocChange}
          title={currentTitle}
        />
      ) : storySection === 'outline' ? (
        <StoryOutlineView doc={outlineDoc} onChange={handleOutlineChange} />
      ) : storySection === 'brief' ? (
        <StoryBriefView doc={briefDoc} onChange={handleBriefChange} />
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
    </>
  );
};

export default App;