// src/components/settings/ApiKeyView.tsx
import React from 'react';
import { Stack } from '@mantine/core';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';
import { validateApiKey } from './utils';
import type { ApiKeyValidation } from '../../types/settings';

type ApiKeyViewProps = {
  apiKeyDraft: string;
  apiKeySaved: string;
  disabled: boolean;
  saving: boolean;
  clearing: boolean;
  deleteConfirm: boolean;
  apiKeySaveError: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export const ApiKeyView: React.FC<ApiKeyViewProps> = ({
  apiKeyDraft,
  apiKeySaved,
  disabled,
  deleteConfirm,
  apiKeySaveError,
  onChange,
  onClear,
}) => {
  const apiKeyValidateForUi = (v: string): ApiKeyValidation => {
    if (apiKeySaveError) return { state: 'error', text: apiKeySaveError };
    return validateApiKey(v);
  };

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
      onChange,
      validate: apiKeyValidateForUi,
    },
    ...(apiKeySaved.trim()
      ? [
          {
            id: 'delete',
            type: 'button',
            label: ' ',
            buttonLabel: deleteConfirm ? 'Click again to remove' : 'Remove key',
            onClick: onClear,
            color: 'red',
            variant: deleteConfirm ? 'filled' : 'subtle',
            disabled,
          } as SettingItem,
        ]
      : []),
  ];

  return (
    <Stack gap="sm">
      <SettingsGroup items={apiKeyItems} ariaLabel="OpenAI API key settings" disabled={false} />
      <SettingsGroupLabel description="The API Key is stored securely in your system keychain on this device. Changes are saved automatically." />
    </Stack>
  );
};
