// src/components/settings/SettingsRootView.tsx
import React, { useMemo } from 'react';
import { Stack } from '@mantine/core';
import { SettingsGroup, type SettingItem } from '../common/SettingsGroup';

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

type SettingsRootViewProps = {
  apiKeySaved: string;
  writingLanguage: WritingLanguage;
  uiSchema: UiSchemaSetting;
  loading: boolean;
  writingLanguageSaving: boolean;
  uiSchemaSaving: boolean;
  onNavigate: () => void;
  onWritingLanguageChange: (lang: WritingLanguage | null) => void;
  onUiSchemaChange: (schema: UiSchemaSetting | null) => void;
};

export const SettingsRootView: React.FC<SettingsRootViewProps> = ({
  apiKeySaved,
  writingLanguage,
  uiSchema,
  loading,
  writingLanguageSaving,
  uiSchemaSaving,
  onNavigate,
  onWritingLanguageChange,
  onUiSchemaChange,
}) => {
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
        onClick: onNavigate,
      },
      {
        id: 'lang-setting',
        type: 'select',
        label: 'Writing language',
        value: writingLanguage,
        onChange: onWritingLanguageChange,
        disabled: langDisabled,
        data: languageOptions,
      },
      {
        id: 'ui-schema-setting',
        type: 'select',
        label: 'UI Theme',
        value: uiSchema,
        onChange: onUiSchemaChange,
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
    onNavigate,
    onWritingLanguageChange,
    onUiSchemaChange,
  ]);

  return (
    <Stack gap="sm">
      <SettingsGroup items={rootItems} ariaLabel="Settings" disabled={loading} />
    </Stack>
  );
};
