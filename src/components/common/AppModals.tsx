// src/components/common/AppModals.tsx
import React from 'react';
import { EntityEditModal } from './EntityEditModal';
import { EntityCreateModal } from './EntityCreateModal';
import { SettingsModal } from '../settings/SettingsModal';
import { WizardModal } from '../wizard/WizardModal';

export interface AppModalsProps {
  // Project modal (edit)
  editingProject: { id: string; name: string } | null;
  onCloseEditProject: () => void;
  onRenameProject: (name: string) => void;
  onDeleteProject: () => void;

  // Story modal (edit)
  editingStory: { id: string; title: string } | null;
  onCloseEditStory: () => void;
  onRenameStory: (title: string) => void;
  onDeleteStory: () => void;

  // NEW: Project create modal
  creatingProject: boolean;
  onCloseCreateProject: () => void;
  onConfirmCreateProject: (name: string) => void | Promise<void>;

  // NEW: Story create modal
  creatingStory: boolean;
  onCloseCreateStory: () => void;
  onConfirmCreateStory: (title: string) => void | Promise<void>;

  // Settings modal
  settingsModalOpen: boolean;
  onCloseSettingsModal: () => void;

  // Wizard modal
  wizardModalOpen: boolean;
  onCloseWizardModal: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  editingProject,
  onCloseEditProject,
  onRenameProject,
  onDeleteProject,

  editingStory,
  onCloseEditStory,
  onRenameStory,
  onDeleteStory,

  creatingProject,
  onCloseCreateProject,
  onConfirmCreateProject,

  creatingStory,
  onCloseCreateStory,
  onConfirmCreateStory,

  settingsModalOpen,
  onCloseSettingsModal,

  wizardModalOpen,
  onCloseWizardModal,
}) => {
  return (
    <>
      {/* Project create modal */}
      <EntityCreateModal
        opened={creatingProject}
        title="New project"
        fieldLabel="Project name"
        placeholder="My new project"
        confirmLabel="Create project"
        onClose={onCloseCreateProject}
        onCreate={onConfirmCreateProject}
      />

      {/* Story create modal */}
      <EntityCreateModal
        opened={creatingStory}
        title="New story"
        fieldLabel="Story title"
        placeholder="My new story"
        confirmLabel="Create story"
        onClose={onCloseCreateStory}
        onCreate={onConfirmCreateStory}
      />

      {/* Project edit modal */}
      <EntityEditModal
        opened={!!editingProject}
        entityType="project"
        title="Edit project"
        fieldLabel="Project Name"
        deleteLabel="project"
        initialName={editingProject?.name ?? ''}
        onClose={onCloseEditProject}
        onSave={onRenameProject}
        onDelete={onDeleteProject}
      />

      {/* Story edit modal */}
      <EntityEditModal
        opened={!!editingStory}
        entityType="story"
        title="Edit story"
        fieldLabel="Title"
        deleteLabel="story"
        initialName={editingStory?.title ?? ''}
        onClose={onCloseEditStory}
        onSave={onRenameStory}
        onDelete={onDeleteStory}
      />

      {/* Settings modal */}
      <SettingsModal opened={settingsModalOpen} onClose={onCloseSettingsModal} />

      {/* Wizard modal */}
      <WizardModal opened={wizardModalOpen} onClose={onCloseWizardModal} />
    </>
  );
};