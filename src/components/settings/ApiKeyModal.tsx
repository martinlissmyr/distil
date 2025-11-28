// src/components/settings/ApiKeyModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Stack,
  PasswordInput,
  Group,
  Button,
  Text,
} from '@mantine/core';
import { Modal } from '../common/Modal';

type ApiKeyModalProps = {
  opened: boolean;
  onClose: () => void;
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  opened,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Load existing key when modal opens
  useEffect(() => {
    if (!opened) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await window.settings?.getApiKey?.();
        if (!cancelled && response) {
          if (response.ok && typeof response.data === 'string') {
            setApiKey(response.data);
          } else if (!response.ok) {
            console.error('Failed to load API key:', response.error);
          }
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
      if (response && !response.ok) {
        console.error('Failed to save API key:', response.error);
        return;
      }
      onClose();
    } catch (e) {
      console.error('Failed to save API key', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setClearing(true);
      const response = await window.settings?.clearApiKey?.();
      if (response && !response.ok) {
        console.error('Failed to clear API key:', response.error);
        return;
      }
      setApiKey('');
      onClose();
    } catch (e) {
      console.error('Failed to clear API key', e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="OpenAI API key"
      subtitle={
        <Text size="xs" c="dimmed">
          Stored securely in your system keychain on this device.
          You can change or remove it at any time.
        </Text>
      }
    >
      <Stack gap="sm">
        <PasswordInput
          label="API key"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          disabled={loading}
          autoComplete="off"
        />

        <Group justify="space-between" mt="sm">
          <Button
            variant="subtle"
            color="red"
            onClick={handleClear}
            disabled={clearing || loading}
          >
            Remove key
          </Button>

          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim() || saving || loading}
            >
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};