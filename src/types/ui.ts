// /src/types/ui.ts
export type UiMode = 'default' | 'prose' | 'meta';
export type UiSchema = 'dark' | 'light';
export type UiSchemaSetting = UiSchema | 'system';

// Source of truth for what you support (dropdowns, validation, etc.)
export const SUPPORTED_UI_SCHEMA_SETTINGS: readonly UiSchemaSetting[] = ['system', 'dark', 'light'] as const;

// Source of truth for default
export const DEFAULT_UI_SCHEMA_SETTING: UiSchemaSetting = 'system';

// Labels for UI
export const UI_SCHEMA_LABEL: Record<UiSchemaSetting, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};