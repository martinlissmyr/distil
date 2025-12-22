// src/components/common/EntityEditModal.tsx
import React, { useEffect, useState } from 'react';
import { Stack, TextInput, Group, Button, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';

type EntityEditModalProps = {
  opened: boolean;
  title: string;            // "Edit project", "Edit story"
  fieldLabel?: string;      // label for the text field, defaults to "Name"
  deleteLabel?: string;     // word used in delete button, e.g. "project", "story"

  initialName: string;

  onClose: () => void;
  onSave: (newName: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export const EntityEditModal: React.FC<EntityEditModalProps> = ({
  opened,
  title,
  fieldLabel = 'Name',
  deleteLabel = 'item',
  initialName,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(initialName);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // When the modal opens (or the entity changes), reset local state
  useEffect(() => {
    if (opened) {
      setName(initialName);
      setDeleteConfirm(false);
    }
  }, [opened, initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSave(trimmed);
  };

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
      value: name,
      onChange: setName,
      placeholder: "Project name",
    },
    {
      id: 'pw',
      type: 'button',
      buttonLabel: deleteConfirm
              ? 'Click again to delete'
              : `Delete ${deleteLabel}`,
      onClick: handleDeleteClick,
    }
  ];

  return (
    <BaseModal
      opened={opened}
      onClose={onClose}
      variant="dialog"
      overlayPreset="glassLight"
      header={<Box p={12}><TopNavigation title={title} onClose={onClose} /></Box>}
      footer={
        <Group justify="flex-end" p={12}>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </Group>
      }
    >
      <Box p={20}>
        <Stack gap="sm">
          <SettingsGroup 
            items={settingsItems} 
            ariaLabel="System settings group"
          />
        </Stack>
      </Box>
    </BaseModal>
  );
};
