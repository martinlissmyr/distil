// src/ui/settings/SettingsModal.tsx
import React, { useEffect, useState } from 'react';
import { Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsRootView } from './SettingsRootView';
import { ApiKeyView } from './ApiKeyView';
import { validateApiKey } from './utils';
import { VIEWS, type SettingsViewId } from './types';

import type { WritingLanguage } from '../../types/language';
import type { UiSchemaSetting } from '../../types/ui';

import { client } from '../../api/client';
import { useAppStore } from '../../state/useAppStore';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

type SettingsModalProps = {
  opened: boolean;
  onClose: () => void;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ opened, onClose }) => {
  // ---- sub-navigation stack ----
  const [stack, setStack] = useState<SettingsViewId[]>(['root']);
  const activeView = stack[stack.length - 1];

  const push = (id: SettingsViewId) => {
    if (id === 'apiKey') {
      setApiKeyDraft(apiKeySaved);
      setApiKeySaveError('');
      setDeleteConfirm(false);
    }
    setStack((s) => [...s, id]);
  };
  const pop = () => {
    debouncedSaveApiKey.cancel();
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };
  const closeModal = () => {
    debouncedSaveApiKey.cancel();
    setStack(['root']);
    onClose();
  };

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
  const uiSchema = useAppStore((s) => s.uiSchemaSetting);
  const uiSchemaLoaded = useAppStore((s) => s.uiSchemaLoaded);
  const loadUiSchema = useAppStore((s) => s.loadUiSchema);
  const setUiSchema = useAppStore((s) => s.setUiSchemaSetting);

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

  // ---- Render view content ----
  const content = (() => {
    if (activeView === 'root') {
      return (
        <SettingsRootView
          apiKeySaved={apiKeySaved}
          writingLanguage={writingLanguage}
          uiSchema={uiSchema}
          loading={loading}
          writingLanguageSaving={writingLanguageSaving}
          uiSchemaSaving={uiSchemaSaving}
          onNavigate={() => push('apiKey')}
          onWritingLanguageChange={handleWritingLanguageChange}
          onUiSchemaChange={handleUiSchemaChange}
        />
      );
    }

    if (activeView === 'apiKey') {
      return (
        <ApiKeyView
          apiKeyDraft={apiKeyDraft}
          apiKeySaved={apiKeySaved}
          disabled={disabled}
          saving={saving}
          clearing={clearing}
          deleteConfirm={deleteConfirm}
          apiKeySaveError={apiKeySaveError}
          onChange={handleApiKeyChange}
          onClear={handleClearClick}
        />
      );
    }

    return null;
  })();

  const title = VIEWS[activeView]?.title ?? 'Settings';

  return (
    <BaseModal
      opened={opened}
      onClose={closeModal}
      variant="dialog"
      overlayPreset="glassLight"
      header={
        <Box p={12}>
          <TopNavigation title={title} onBack={stack.length > 1 ? pop : undefined} onClose={closeModal} />
        </Box>
      }
    >
      <Box p={20}>{content}</Box>
    </BaseModal>
  );
};
