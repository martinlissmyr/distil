// src/ui/layout/AppContent.tsx
import React from 'react';
import { Box } from '@mantine/core';
import { ProjectsView } from '../projects/ProjectsView';
import { ManifestView } from '../documents/meta/ManifestView';
import { PlaygroundView } from '../playground/PlaygroundView';
import { StoriesView } from '../stories/StoriesView';
import { StoryTextView } from '../story/StoryTextView';
import { OutlineView } from '../documents/meta/OutlineView';
import { WorldView } from '../documents/meta/WorldView';
import { BriefView } from '../documents/meta/BriefView';
import { EntityIndexView } from '../story/EntityIndexView';
import type { Project, StoryMeta } from '../../api/client';
import type { AppSection, RootSection, StorySection } from '../../hooks/useNavigation';
import { getSectionConfig, isSectionImplemented, type SectionId } from '../../models/sections';
import type { DocKindId } from '../../models/docs';

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
  currentDoc: any;
  currentTitle: string;

  // Handlers
  handleSelectProject: (id: string) => void;
  handleCreateProject: () => void;
  handleOpenEditProject: (id: string) => void;
  handleSelectStory: (id: string) => void;
  handleCreateStory: () => void;
  handleOpenEditStory: (id: string) => void;
  handleDocChange: (doc: any) => void;
  onReorderProjects: (ids: string[]) => void;
  onReorderStories: (ids: string[]) => void;
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
  onReorderProjects,
  onReorderStories,
}) => {
  // Root section views
  if (appSection === 'root' && rootSection === 'projects') {
    return (
      <ProjectsView
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onEditProject={handleOpenEditProject}
        onReorderProjects={onReorderProjects}
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
        onReorderStories={onReorderStories}
      />
    );
  }

  // Story view - various sections
  if (appSection === 'story' && selectedProjectId && selectedStoryId) {
    const sectionConfig = getSectionConfig(storySection as SectionId);

    // Render placeholder for unimplemented sections
    if (!isSectionImplemented(storySection as SectionId)) {
      return <Box p="md">{sectionConfig.label} (coming soon)</Box>;
    }

    // Map section component name to actual component with props
    switch (sectionConfig.component) {
      case 'StoryTextView':
        return (
          <StoryTextView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
            doc={currentDoc}
            onChange={handleDocChange}
            title={currentTitle}
          />
        );

      case 'StoryOutlineView':
        return (
          <OutlineView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
            title={`${currentTitle} – Outline`}
          />
        );

      case 'StoryWorldView':
        return (
          <WorldView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
            title={`${currentTitle} – World`}
          />
        );

      case 'StoryBriefView':
        return (
          <BriefView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
            title={`${currentTitle} – Brief`}
          />
        );

      case 'EntityIndexView':
        // Type guard: only characters and locations use EntityIndexView
        const docKind = sectionConfig.docKind as DocKindId;
        if (docKind !== 'characters' && docKind !== 'locations') {
          return <Box p="md">Invalid entity type</Box>;
        }
        return (
          <EntityIndexView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
            docKind={docKind}
            currentStoryTitle={currentTitle}
          />
        );

      default:
        return <Box p="md">{sectionConfig.label} (placeholder)</Box>;
    }
  }

  // Invalid state fallback
  return <Box p="md">Invalid state</Box>;
};
