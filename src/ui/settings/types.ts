// src/ui/settings/types.ts

/**
 * Internal navigation types for settings modal.
 */

export type SettingsViewId = 'root' | 'apiKey';

export type ViewConfig = {
  id: SettingsViewId;
  title: string;
};

export const VIEWS: Record<SettingsViewId, ViewConfig> = {
  root: { id: 'root', title: 'Settings' },
  apiKey: { id: 'apiKey', title: 'OpenAI API key' },
};
