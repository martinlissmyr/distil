// src/components/settings/SettingsModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';

type SettingsModalProps = {
  opened: boolean;
  onClose: () => void;
};

type SettingsViewId = 'root' | 'apiKey';

type ViewConfig = {
  id: SettingsViewId;
  title: string;
};

const VIEWS: Record<SettingsViewId, ViewConfig> = {
  root: { id: 'root', title: 'Settings' },
  apiKey: { id: 'apiKey', title: 'OpenAI API key' },
};

// Small debouncer without extra deps
function useDebouncedCallback<TArgs extends any[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  delayMs: number
) {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const cancel = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const call = (...args: TArgs) => {
    cancel();
    timeoutRef.current = window.setTimeout(() => fn(...args), delayMs);
  };

  return { call, cancel };
}

type ApiKeyValidation =
  | { state: 'ok'; text?: string }
  | { state: 'error'; text?: string }
  | { state: 'empty'; text?: string };

const validateApiKey = (v: string): ApiKeyValidation => {
  const trimmed = v.trim();

  if (!trimmed) {
    return {
      state: 'empty',
      text: 'No API key set',
    };
  }

  if (!trimmed.startsWith('sk-')) {
    return {
      state: 'error',
      text: 'OpenAI API keys must start with "sk-"',
    };
  }

  return { state: 'ok' };
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ opened, onClose }) => {
  // ---- sub-navigation stack ----
  const [stack, setStack] = useState<SettingsViewId[]>(['root']);
  const activeView = stack[stack.length - 1];

  const push = (id: SettingsViewId) => setStack((s) => [...s, id]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const reset = () => setStack(['root']);

  useEffect(() => {
    if (!opened) reset();
  }, [opened]);

  // ---- API key state (used by root + apiKey view) ----
  const [apiKeySaved, setApiKeySaved] = useState(''); // last saved/loaded value
  const [apiKeyDraft, setApiKeyDraft] = useState(''); // what user edits in apiKey view

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // autosave error state (shown on the input via validation text)
  const [apiKeySaveError, setApiKeySaveError] = useState<string>('');

  // Auto-reset delete confirmation after 5 seconds
  useEffect(() => {
    if (!deleteConfirm) return;
    const timer = window.setTimeout(() => setDeleteConfirm(false), 5000);
    return () => window.clearTimeout(timer);
  }, [deleteConfirm]);

  const disabled = loading || saving || clearing;

  // ---- Autosave (debounced) ----
  const saveApiKey = async (value: string) => {
    const trimmed = value.trim();
    const validation = validateApiKey(value);

    try {
      setSaving(true);

      // 🚫 Block save if invalid
      if (validation.state === 'error') {
        setApiKeySaveError(validation.text ?? 'Invalid API key');
        return;
      }

      // 🧹 Empty = clear key
      if (validation.state === 'empty') {
        const response = await window.settings?.clearApiKey?.();
        if (!response?.ok) {
          const msg = response?.error ? String(response.error) : 'Failed to clear API key';
          setApiKeySaveError(msg);
          return;
        }

        setApiKeySaved('');
        setApiKeySaveError('');
        return;
      }

      // ✅ Valid key → save
      const response = await window.settings?.setApiKey?.(trimmed);
      if (!response?.ok) {
        const msg = response?.error ? String(response.error) : 'Failed to save API key';
        setApiKeySaveError(msg);
        return;
      }

      setApiKeySaved(trimmed);
      setApiKeySaveError('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save API key';
      setApiKeySaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ✅ debouncer AFTER saveApiKey is defined
  const debouncedSaveApiKey = useDebouncedCallback(saveApiKey, 450);

  // Load key on open
  useEffect(() => {
    if (!opened) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await window.settings?.getApiKey?.();
        if (!cancelled && response?.ok && typeof response.data === 'string') {
          setApiKeySaved(response.data);
          setApiKeyDraft(response.data);
        }
      } catch (e) {
        console.error('Failed to load API key', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setDeleteConfirm(false);
    setApiKeySaveError('');
    load();

    return () => {
      cancelled = true;
    };
  }, [opened]);

  // When entering/leaving the apiKey subview
  useEffect(() => {
    if (activeView === 'apiKey') {
      // entering apiKey view: reset transient state and draft to last saved
      setApiKeyDraft(apiKeySaved);
      setApiKeySaveError('');
      setDeleteConfirm(false);
    } else {
      // leaving apiKey view: cancel pending autosave
      debouncedSaveApiKey.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, apiKeySaved]);

  const handleApiKeyChange = (v: string) => {
    setApiKeyDraft(v);
    if (deleteConfirm) setDeleteConfirm(false);
    if (apiKeySaveError) setApiKeySaveError('');

    debouncedSaveApiKey.call(v);
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
        setApiKeySaved('');
        setApiKeyDraft('');
        setApiKeySaveError('');
      } else {
        const msg = response?.error ? String(response.error) : 'Failed to clear API key';
        setApiKeySaveError(msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to clear API key';
      setApiKeySaveError(msg);
    } finally {
      setClearing(false);
      setDeleteConfirm(false);
    }
  };

  // Root view items (navigation)
  const rootItems: SettingItem[] = useMemo(() => {
    return [
      {
        id: 'api-key-settings-nav',
        type: 'navigation',
        label: 'OpenAI API key',
        rightText: apiKeySaved.trim() ? 'sk-*********************' : 'Add a key',
        onClick: () => push('apiKey'),
      },
    ];
  }, [apiKeySaved]);

  // Validation for the UI icon/tooltip:
  // - we show "save error" if present
  // - otherwise show format validation
  const apiKeyValidateForUi = (v: string): ApiKeyValidation => {
    if (apiKeySaveError) return { state: 'error', text: apiKeySaveError };
    return validateApiKey(v);
  };

  // ---- Render view content ----
  const content = (() => {
    if (activeView === 'root') {
      return (
        <Stack gap="sm">
          <SettingsGroup items={rootItems} ariaLabel="Settings" disabled={loading} />
        </Stack>
      );
    }

    if (activeView === 'apiKey') {
      const apiKeyItems: SettingItem[] = [
        {
          id: 'api-key',
          type: 'text',
          label: 'API key',
          value: apiKeyDraft,

          multiline: true,
          minRows: 2,
          maxRows: 6,

          placeholder: 'sk-...',
          disabled,
          onChange: handleApiKeyChange,
          validate: apiKeyValidateForUi,
        },
        ...(apiKeySaved.trim()
          ? [
              {
                id: 'delete',
                type: 'button',
                label: ' ',
                buttonLabel: deleteConfirm ? 'Click again to remove' : 'Remove key',
                onClick: handleClearClick,
                color: 'red',
                variant: deleteConfirm ? 'filled' : 'subtle',
                disabled,
              } as SettingItem,
            ]
          : []),
      ];

      return (
        <Stack gap="sm">
          <SettingsGroup
            items={apiKeyItems}
            ariaLabel="OpenAI API key settings"
            disabled={loading}
          />
          <SettingsGroupLabel description="The API Key is stored securely in your system keychain on this device. Changes are saved automatically." />
        </Stack>
      );
    }

    return null;
  })();

  const title = VIEWS[activeView]?.title ?? 'Settings';

  return (
    <BaseModal
      opened={opened}
      onClose={onClose}
      variant="dialog"
      overlayPreset="glassLight"
      header={
        <Box p={12}>
          <TopNavigation
            title={title}
            onBack={stack.length > 1 ? pop : undefined}
            onClose={onClose}
          />
        </Box>
      }
    >
      <Box p={20}>{content}</Box>
    </BaseModal>
  );
};