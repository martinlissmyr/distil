// src/ui/projects/ProjectsView.tsx
import React from 'react';
import { Box } from '@mantine/core';
import type { Project } from '../../api/client';
import { EntityGrid } from '../common/EntityGrid';
import { TopNavigation } from '../common/TopNavigation';

type ProjectsViewProps = {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onEditProject: (id: string) => void;
  onReorderProjects: (ids: string[]) => void;
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onReorderProjects,
}) => {
  return (
    <Box>
      <Box py={20} px={30}>
        <TopNavigation
          title="Projects"
        />
      </Box>
      <EntityGrid
        items={projects}
        getId={(p) => p.id}
        getLabel={(p) => p.name}
        onSelect={onSelectProject}
        onEdit={onEditProject}
        onCreate={onCreateProject}
        icon="project"
        title="Projects"
        createLabel="New Project"
        onReorderEntities={onReorderProjects}
      />
    </Box>
  );
};