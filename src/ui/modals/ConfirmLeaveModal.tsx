// src/ui/common/ConfirmLeaveModal.tsx
import React from 'react';
import { Box, Group, Text, Button, ActionIcon } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';

type ConfirmLeaveModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const ConfirmLeaveModal: React.FC<ConfirmLeaveModalProps> = ({
  opened,
  onClose,
  onConfirm,
  title = 'Discard changes?',
  message,
  confirmLabel = 'Discard',
  cancelLabel = 'Cancel',
}) => {
  return (
    <BaseModal
      opened={opened}
      onClose={onClose}
      variant="dialog"
      size="sm"
      overlayPreset="glassLight"
      closeOnEscape={true}
      closeOnClickOutside={false}
      headerOffsetPx={60}
      footerOffsetPx={70}
      header={
        <Box p={12}>
          <TopNavigation title={title} onClose={onClose} />
        </Box>
      }
      footer={
        <Group justify="space-between" p={12}>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="filled" color="red" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      }
    >
      <Box px={20} py={24}>
        <Text size="sm" c="dimmed" align="center">
          {message}
        </Text>
      </Box>
    </BaseModal>
  );
};
