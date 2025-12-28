// src/components/settings/SettingsModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import {
  SettingsGroup,
  SettingsGroupLabel,
  type SettingItem,
} from '../common/SettingsGroup';

import type { WritingLanguage } from '../../types/language';
import {
  WRITING_LANGUAGE_LABEL,
  SUPPORTED_WRITING_LANGUAGES,
} from '../../types/language';

import type { UiSchemaSetting } from '../../types/ui';
import {
  UI_SCHEMA_LABEL,
  SUPPORTED_UI_SCHEMA_SETTINGS,
} from '../../types/ui';

import { client } from '../../api/client';
import { useAppStore } from '../../state/useAppStore';

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

  // ---- Writing language (Zustand; applies immediately app-wide) ----
  const writingLanguage = useAppStore((s) => s.writingLanguage);
  const writingLanguageLoaded = useAppStore((s) => s.writingLanguageLoaded);
  const loadWritingLanguage = useAppStore((s) => s.loadWritingLanguage);
  const setWritingLanguage = useAppStore((s) => s.setWritingLanguage);

  const [writingLanguageSaving, setWritingLanguageSaving] = useState(false);

  // ---- UI Schema (Zustand; applies immediately app-wide) ----
  // NOTE: these store fields/actions must exist (mirror writingLanguage pattern):
  // uiSchemaSetting, uiSchemaLoaded, loadUiSchema, setUiSchema
  const uiSchema = useAppStore((s) => (s as any).uiSchemaSetting as UiSchemaSetting);
  const uiSchemaLoaded = useAppStore((s) => Boolean((s as any).uiSchemaLoaded));
  const loadUiSchema = useAppStore((s) => (s as any).loadUiSchemaSetting as () => Promise<void>);
  const setUiSchema = useAppStore(
    (s) => (s as any).setUiSchemaSetting as (v: UiSchemaSetting) => Promise<void>
  );

  const [uiSchemaSaving, setUiSchemaSaving] = useState(false);

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

  // Load settings on open (API key + store-backed settings)
  useEffect(() => {
    if (!opened) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        // Reset transient UI state on open
        setDeleteConfirm(false);
        setApiKeySaveError('');

        // Load API key (modal-local)
        const apiKeyResp = await client.getApiKey();
        if (cancelled) return;

        if (apiKeyResp.ok) {
          const key = typeof apiKeyResp.data === 'string' ? apiKeyResp.data : '';
          setApiKeySaved(key);
          setApiKeyDraft(key);
        } else {
          console.error('Failed to load API key:', apiKeyResp.error);
          setApiKeySaved('');
          setApiKeyDraft('');
        }

        // Load app-wide settings via store (idempotent)
        // (these will ensure other parts of the app also get the values)
        if (!writingLanguageLoaded) await loadWritingLanguage();
        if (!uiSchemaLoaded) await loadUiSchema();
      } catch (e) {
        console.error('Failed to load settings', e);
        if (!cancelled) {
          setApiKeySaved('');
          setApiKeyDraft('');
          // store actions already have fallbacks; nothing else needed here
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [opened, writingLanguageLoaded, loadWritingLanguage, uiSchemaLoaded, loadUiSchema]);

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

  const handleWritingLanguageChange = async (lang: WritingLanguage | null) => {
    if (!lang) return;

    try {
      setWritingLanguageSaving(true);
      // ✅ store setter is optimistic, so the app updates immediately
      await setWritingLanguage(lang);
    } catch (e) {
      console.error('Failed to save writing language', e);
    } finally {
      setWritingLanguageSaving(false);
    }
  };

  const handleUiSchemaChange = async (nextValue: UiSchemaSetting | null) => {
    if (!nextValue) return;

    try {
      setUiSchemaSaving(true);
      // ✅ store setter should be optimistic -> UI applies immediately
      await setUiSchema(nextValue);
    } catch (e) {
      console.error('Failed to save UI schema', e);
    } finally {
      setUiSchemaSaving(false);
    }
  };

  // Root view items (navigation)
  const rootItems: SettingItem[] = useMemo(() => {
    const langDisabled = loading || writingLanguageSaving;
    const uiDisabled = loading || uiSchemaSaving;

    const languageOptions = SUPPORTED_WRITING_LANGUAGES.map((lang) => ({
      value: lang,
      label: WRITING_LANGUAGE_LABEL[lang] ?? lang,
    }));

    const uiSchemaOptions = SUPPORTED_UI_SCHEMA_SETTINGS.map((v) => ({
      value: v,
      label: UI_SCHEMA_LABEL[v] ?? v,
    }));

    return [
      {
        id: 'api-key-settings-nav',
        type: 'navigation',
        label: 'OpenAI API key',
        rightText: apiKeySaved.trim() ? 'sk-*********************' : 'Add a key',
        onClick: () => push('apiKey'),
      },
      {
        id: 'lang-setting',
        type: 'select',
        label: 'Writing language',
        value: writingLanguage,
        onChange: handleWritingLanguageChange,
        disabled: langDisabled,
        data: languageOptions,
      },
      {
        id: 'ui-schema-setting',
        type: 'select',
        label: 'UI Theme',
        value: uiSchema,
        onChange: handleUiSchemaChange,
        disabled: uiDisabled,
        data: uiSchemaOptions,
      },
    ];
  }, [
    apiKeySaved,
    writingLanguage,
    uiSchema,
    loading,
    writingLanguageSaving,
    uiSchemaSaving,
  ]);

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
          <SettingsGroup items={apiKeyItems} ariaLabel="OpenAI API key settings" disabled={loading} />
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
          <TopNavigation title={title} onBack={stack.length > 1 ? pop : undefined} onClose={onClose} />
        </Box>
      }
    >
      <Box p={20}>{content}</Box>
    </BaseModal>
  );
};