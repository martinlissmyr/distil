// src/components/settings/ApiKeyModal.tsx
import React, { useEffect, useState } from 'react';
import { Stack, Group, Button, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';

type ApiKeyModalProps = {
  opened: boolean;
  onClose: () => void;
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ opened, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Load key on open
  useEffect(() => {
    if (!opened) return;

    setDeleteConfirm(false);

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await window.settings?.getApiKey?.();
        if (!cancelled && response?.ok && typeof response.data === 'string') {
          setApiKey(response.data);
        }
      } catch (e) {
        console.error('Failed to load API key', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [opened]);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    try {
      setSaving(true);
      const response = await window.settings?.setApiKey?.(trimmed);
      if (response?.ok) onClose();
    } catch (e) {
      console.error('Failed to save API key', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClearClick = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    try {
      setClearing(true);
      const response = await window.settings?.clearApiKey?.();
      if (response?.ok) {
        setApiKey('');
        onClose();
      }
    } catch (e) {
      console.error('Failed to clear API key', e);
    } finally {
      setClearing(false);
      setDeleteConfirm(false);
    }
  };

  const disabled = loading || saving || clearing;

  const settingsItems: SettingItem[] = [
    {
      id: 'api-key',
      type: 'text',
      label: 'API key',
      value: apiKey,
      masked: true,
      placeholder: 'sk-...',
      disabled,
      onChange: (v) => {
        setApiKey(v);
        if (deleteConfirm) setDeleteConfirm(false);
      },
    },
    ...(apiKey
      ? [
          {
            id: 'delete',
            type: 'button',
            label: ' ',
            buttonLabel: deleteConfirm
              ? 'Click again to remove'
              : 'Remove key',
            onClick: handleClearClick,
            color: 'red',
            variant: deleteConfirm ? 'filled' : 'subtle',
            disabled,
          } as SettingItem,
        ]
      : []),
  ];

  return (
    <BaseModal
      opened={opened}
      onClose={onClose}
      variant="dialog"
      overlayPreset="glassLight"
      header={
        <Box p={12}>
          <TopNavigation title="Settings" onClose={onClose} />
        </Box>
      }
      footer={
        <Group justify="flex-end" p={12}>
          <Button
            onClick={handleSave}
            disabled={!apiKey.trim() || disabled}
          >
            Save
          </Button>
        </Group>
      }
    >
      <Box p={20}>
        <Stack gap="sm">
          <SettingsGroupLabel
            label="OpenAI API key"
            description="Stored securely in your system keychain on this device. You can change or remove it at any time."
          />
          <SettingsGroup
            items={settingsItems}
            ariaLabel="OpenAI API key settings"
            disabled={loading}
          />
        </Stack>
      </Box>
    </BaseModal>
  );
};