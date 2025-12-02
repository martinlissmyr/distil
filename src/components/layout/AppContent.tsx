// src/components/layout/AppContent.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { ProjectsView } from '../projects/ProjectsView';
import { ManifestView } from '../manifest/ManifestView';
import { PlaygroundView } from '../playground/PlaygroundView';
import { StoriesView } from '../stories/StoriesView';
import { StoryTextView } from '../story/StoryTextView';
import { StoryOutlineView } from '../story/StoryOutlineView';
import { StoryWorldView } from '../story/StoryWorldView';
import { StoryBriefView } from '../story/StoryBriefView';
import type { Project, StoryMeta } from '../../api/alineaClient';
import type { ProseDoc } from '../editor/ProseEditor';
import type { AppSection, RootSection, StorySection } from '../../hooks/useNavigation';

export interface AppContentProps {
  // Navigation state
  appSection: AppSection;
  rootSection: RootSection;
  storySection: StorySection;
  selectedProjectId: string | null;
  selectedStoryId: string | null;

  // Data
  projects: Project[];
  stories: StoryMeta[];
  currentProject: Project | undefined;

  // Editor state
  currentDoc: ProseDoc | null;
  currentTitle: string;

  // Handlers
  handleSelectProject: (id: string) => void;
  handleCreateProject: () => void;
  handleOpenEditProject: (id: string) => void;
  handleSelectStory: (id: string) => void;
  handleCreateStory: () => void;
  handleOpenEditStory: (id: string) => void;
  handleDocChange: (doc: ProseDoc) => void;
}

/**
 * AppContent - Renders the main content area based on navigation state
 *
 * Handles routing logic to determine which view to show:
 * - Root sections: Projects, Manifest, Assistant
 * - Project view: Stories list
 * - Story sections: Prose, Outline, Brief, Characters, Locations
 */
export const AppContent: React.FC<AppContentProps> = ({
  appSection,
  rootSection,
  storySection,
  selectedProjectId,
  selectedStoryId,
  projects,
  stories,
  currentProject,
  currentDoc,
  currentTitle,
  handleSelectProject,
  handleCreateProject,
  handleOpenEditProject,
  handleSelectStory,
  handleCreateStory,
  handleOpenEditStory,
  handleDocChange,
}) => {
  // Root section views
  if (appSection === 'root' && rootSection === 'projects') {
    return (
      <ProjectsView
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onEditProject={handleOpenEditProject}
      />
    );
  }

  if (appSection === 'root' && rootSection === 'manifest') {
    return <ManifestView />;
  }

  if (appSection === 'root' && rootSection === 'playground') {
    return <PlaygroundView />;
  }

  // Project view - stories list
  if (appSection === 'project' && selectedProjectId && !selectedStoryId) {
    return (
      <StoriesView
        stories={stories}
        currentProject={currentProject}
        onSelectStory={handleSelectStory}
        onCreateStory={handleCreateStory}
        onEditStory={handleOpenEditStory}
      />
    );
  }

  // Story view - various sections
  if (appSection === 'story' && selectedProjectId && selectedStoryId) {
    if (storySection === 'prose') {
      return (
        <StoryTextView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
          doc={currentDoc}
          onChange={handleDocChange}
          title={currentTitle}
        />
      );
    }

    if (storySection === 'outline') {
      return (
        <StoryOutlineView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
        />
      );
    }

    if (storySection === 'world') {
      return (
        <StoryWorldView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
        />
      );
    }

    if (storySection === 'brief') {
      return (
        <StoryBriefView
          projectId={selectedProjectId}
          storyId={selectedStoryId}
        />
      );
    }

    if (storySection === 'characters') {
      return <Box p="md">Characters (placeholder)</Box>;
    }

    if (storySection === 'locations') {
      return <Box p="md">Locations (placeholder)</Box>;
    }
  }

  // Invalid state fallback
  return <Box p="md">Invalid state</Box>;
};
