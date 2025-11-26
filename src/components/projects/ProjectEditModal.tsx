// src/components/projects/ProjectEditModal.tsx
import React from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Group,
  Button,
} from '@mantine/core';

type ProjectEditModalProps = {
  opened: boolean;
  name: string;
  isDeleteConfirming: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onRequestDelete: () => void; // handles first + second click
  onSave: () => void;
};

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  opened,
  name,
  isDeleteConfirming,
  onClose,
  onNameChange,
  onRequestDelete,
  onSave,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit project"
      radius="lg"
      centered
    >
      <Stack gap="sm">
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => onNameChange(e.currentTarget.value)}
          autoFocus
        />

        <Group justify="space-between" mt="sm">
          <Button
            variant={isDeleteConfirming ? 'filled' : 'outline'}
            color="red"
            onClick={onRequestDelete}
          >
            {isDeleteConfirming ? 'Click again to delete' : 'Delete project'}
          </Button>

          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={!name.trim()}>
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};