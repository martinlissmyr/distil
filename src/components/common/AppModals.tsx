// src/components/common/AppModals.tsx
import React from 'react';
import { EntityEditModal } from './EntityEditModal';
import { SettingsModal } from '../settings/SettingsModal';
import { WizardModal } from '../wizard/WizardModal';

export interface AppModalsProps {
  // Project modal
  editingProject: { id: string; name: string } | null;
  onCloseEditProject: () => void;
  onRenameProject: (name: string) => void;
  onDeleteProject: () => void;

  // Story modal
  editingStory: { id: string; title: string } | null;
  onCloseEditStory: () => void;
  onRenameStory: (title: string) => void;
  onDeleteStory: () => void;

  // API Key modal
  settingsModalOpen: boolean;
  onCloseSettingsModal: () => void;

  // Wizard modal
  wizardModalOpen: boolean;
  onCloseWizardModal: () => void;
}

/**
 * AppModals - Manages all app-level modals
 *
 * Consolidates modal state and rendering:
 * - Project edit modal (rename/delete)
 * - Story edit modal (rename/delete)
 * - API Key settings modal
 */
export const AppModals: React.FC<AppModalsProps> = ({
  editingProject,
  onCloseEditProject,
  onRenameProject,
  onDeleteProject,
  editingStory,
  onCloseEditStory,
  onRenameStory,
  onDeleteStory,
  settingsModalOpen,
  onCloseSettingsModal,
  wizardModalOpen,
  onCloseWizardModal,
}) => {
  return (
    <>
      {/* Project edit modal */}
      <EntityEditModal
        opened={!!editingProject}
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
        title="Edit story"
        fieldLabel="Title"
        deleteLabel="story"
        initialName={editingStory?.title ?? ''}
        onClose={onCloseEditStory}
        onSave={onRenameStory}
        onDelete={onDeleteStory}
      />

      {/* API Key Modal */}
      <SettingsModal
        opened={settingsModalOpen}
        onClose={onCloseSettingsModal}
      />

      {/* Wizard Modal */}
      <WizardModal
        opened={wizardModalOpen}
        onClose={onCloseWizardModal}
      />
    </>
  );
};
