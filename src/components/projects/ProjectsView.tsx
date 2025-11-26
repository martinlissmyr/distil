// src/components/projects/ProjectsView.tsx
import React from 'react';
import type { Project } from '../../api/alineaClient';
import { EntityGrid } from '../common/EntityGrid';
import { SquareLibrary } from 'lucide-react';

type ProjectsViewProps = {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onEditProject: (id: string) => void;
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
  onEditProject,
}) => {
  return (
    <EntityGrid
      items={projects}
      getId={(p) => p.id}
      getLabel={(p) => p.name}
      onSelect={onSelectProject}
      onEdit={onEditProject}
      onCreate={onCreateProject}
      Icon={SquareLibrary}
      title="Projects"
    />
  );
};