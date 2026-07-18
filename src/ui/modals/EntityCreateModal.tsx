// src/ui/common/EntityCreateModal.tsx
import React, { useEffect, useState } from 'react';
import { Stack, Group, Button, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsGroup, type SettingItem } from '../common/SettingsGroup';

type EntityCreateModalProps = {
  opened: boolean;
  title: string;            // "New project", "New story"
  fieldLabel?: string;      // label for the text field
  placeholder?: string;     // input placeholder
  initialValue?: string;    // defaults to ""
  confirmLabel?: string;    // "Create project", "Create story"

  onClose: () => void;
  onCreate: (value: string) => void | Promise<void>;
};

export const EntityCreateModal: React.FC<EntityCreateModalProps> = ({
  opened,
  title,
  fieldLabel = 'Name',
  placeholder = '',
  initialValue = '',
  confirmLabel = 'Create',
  onClose,
  onCreate,
}) => {
  const [valueState, setValueState] = useState<{ sessionKey: string; value: string }>({
    sessionKey: `${opened}:${initialValue}`,
    value: initialValue,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const value = valueState.sessionKey === `${opened}:${initialValue}` ? valueState.value : initialValue;

  useEffect(() => {
    if (opened) {
      const timeoutId = window.setTimeout(() => {
        setValueState({ sessionKey: `${opened}:${initialValue}`, value: initialValue });
        setIsSubmitting(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [opened, initialValue]);

  const handleCreate = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onCreate(trimmed);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const items: SettingItem[] = [
    {
      id: 'name',
      type: 'text',
      label: fieldLabel,
      value,
      onChange: (nextValue) =>
        setValueState({ sessionKey: `${opened}:${initialValue}`, value: nextValue }),
      placeholder,
      autoFocus: true,
      onCmdEnter: handleCreate,
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
      footer={
        <Group justify="flex-end" p={12}>
          <Button onClick={handleCreate} disabled={!value.trim()} loading={isSubmitting}>
            {confirmLabel}
          </Button>
        </Group>
      }
    >
      <Box p={20}>
        <Stack gap="sm">
          <SettingsGroup items={items} ariaLabel={`${title} form`} />
        </Stack>
      </Box>
    </BaseModal>
  );
};
