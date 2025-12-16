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
import { EntityIndexView } from '../story/EntityIndexView';
import type { Project, StoryMeta } from '../../api/client';
import type { ProseDoc } from '../editor/ProseEditor';
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
          <StoryOutlineView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
          />
        );

      case 'StoryWorldView':
        return (
          <StoryWorldView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
          />
        );

      case 'StoryBriefView':
        return (
          <StoryBriefView
            projectId={selectedProjectId}
            storyId={selectedStoryId}
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
          />
        );

      default:
        return <Box p="md">{sectionConfig.label} (placeholder)</Box>;
    }
  }

  // Invalid state fallback
  return <Box p="md">Invalid state</Box>;
};
