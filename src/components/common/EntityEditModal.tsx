// src/components/common/EntityEditModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Stack, TextInput, Group, Button } from '@mantine/core';

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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      radius="lg"
      centered
    >
      <Stack gap="sm">
        <TextInput
          label={fieldLabel}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          autoFocus
        />

        <Group justify="space-between" mt="sm">
          <Button
            variant={deleteConfirm ? 'filled' : 'outline'}
            color="red"
            onClick={handleDeleteClick}
          >
            {deleteConfirm
              ? 'Click again to delete'
              : `Delete ${deleteLabel}`}
          </Button>

          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};