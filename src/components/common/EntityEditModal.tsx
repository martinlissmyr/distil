// src/components/common/EntityEditModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Stack, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsGroup, type SettingItem } from '../common/SettingsGroup';
import {
  generateProjectName,
  generateStoryTitle,
} from '../../helpers/nameGenerator';

type EntityType = 'project' | 'story';

type EntityEditModalProps = {
  opened: boolean;
  title: string;            // "Edit project", "Edit story"
  entityType: EntityType;

  fieldLabel?: string;      // defaults to "Name"
  deleteLabel?: string;     // "project", "story"

  initialName: string;

  onClose: () => void;
  onSave: (newName: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export const EntityEditModal: React.FC<EntityEditModalProps> = ({
  opened,
  title,
  entityType,
  fieldLabel = 'Name',
  deleteLabel = 'item',
  initialName,
  onClose,
  onSave,
  onDelete,
}) => {
  /** What the user is typing (may be empty) */
  const [draftName, setDraftName] = useState(initialName);

  /** Last name we actually saved (prevents loops) */
  const lastSavedRef = useRef<string>(initialName);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (!opened) return;

    setDraftName(initialName);
    lastSavedRef.current = initialName;
    setDeleteConfirm(false);
  }, [opened, initialName]);

  // Auto-save when effective name changes
  useEffect(() => {
    if (!opened) return;

    const trimmed = draftName.trim();

    const generated =
      entityType === 'project'
        ? generateProjectName()
        : generateStoryTitle();

    const effectiveName = trimmed || generated;

    if (effectiveName === lastSavedRef.current) return;

    lastSavedRef.current = effectiveName;
    void onSave(effectiveName);
  }, [draftName, entityType, opened, onSave]);

  const handleDeleteClick = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    await onDelete();
  };

  const settingsItems: SettingItem[] = [
    {
      id: 'name',
      type: 'text',
      label: fieldLabel,
      value: draftName,
      onChange: setDraftName,
      placeholder:
        entityType === 'project' ? 'Project name' : 'Story title',
      autoFocus: true,
    },
    {
      id: 'delete',
      type: 'button',
      buttonLabel: deleteConfirm
        ? 'Click again to delete'
        : `Delete ${deleteLabel}`,
      onClick: handleDeleteClick,
    },
  ];

  return (
    <BaseModal
      opened={opened}
      onClose={onClose}
      variant="dialog"
      overlayPreset="glassLight"
      header={
        <Box p={12}>
          <TopNavigation title={title} onClose={onClose} />
        </Box>
      }
    >
      <Box p={20}>
        <Stack gap="sm">
          <SettingsGroup
            items={settingsItems}
            ariaLabel={`${title} settings`}
          />
        </Stack>
      </Box>
    </BaseModal>
  );
};