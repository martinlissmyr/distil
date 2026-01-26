// src/ui/common/AppModals.tsx
import React from 'react';
import { EntityEditModal } from '../modals/EntityEditModal';
import { EntityCreateModal } from '../modals/EntityCreateModal';
import { SettingsModal } from '../settings/SettingsModal';
import { WizardModal } from '../wizard/WizardModal';
import { ConfirmLeaveModal } from '../modals/ConfirmLeaveModal';
import { ExportProgressModal } from '../modals/ExportProgressModal';
import type { ExportStatus } from '../modals/ExportProgressModal';

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

  // Leave guard modal
  leaveGuardModalOpen: boolean;
  leaveGuardTitle?: string;
  leaveGuardMessage: string;
  leaveGuardConfirmLabel?: string;
  leaveGuardCancelLabel?: string;
  onLeaveGuardConfirm: () => void;
  onLeaveGuardCancel: () => void;

  // Export modal
  exportModalOpen: boolean;
  onCloseExportModal: () => void;
  exportStatus: ExportStatus;
  exportFormat: 'docx' | 'pdf';
  exportError?: string;
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

  leaveGuardModalOpen,
  leaveGuardTitle,
  leaveGuardMessage,
  leaveGuardConfirmLabel,
  leaveGuardCancelLabel,
  onLeaveGuardConfirm,
  onLeaveGuardCancel,

  exportModalOpen,
  onCloseExportModal,
  exportStatus,
  exportFormat,
  exportError,
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

      {/* Leave guard modal */}
      <ConfirmLeaveModal
        opened={leaveGuardModalOpen}
        onClose={onLeaveGuardCancel}
        onConfirm={onLeaveGuardConfirm}
        title={leaveGuardTitle}
        message={leaveGuardMessage}
        confirmLabel={leaveGuardConfirmLabel}
        cancelLabel={leaveGuardCancelLabel}
      />

      {/* Export progress modal */}
      <ExportProgressModal
        opened={exportModalOpen}
        onClose={onCloseExportModal}
        status={exportStatus}
        format={exportFormat}
        errorMessage={exportError}
      />
    </>
  );
};