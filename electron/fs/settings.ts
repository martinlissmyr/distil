// electron/fs/settings.ts
import { readAuthorSettings, writeAuthorSettings } from './authorBundle';

export type AppSettingsFile = {
  language?: string; // Changed from writingLanguage for consistency
  uiSchema?: string;
};

export async function getWritingLanguage(): Promise<string | null> {
  const settings = await readAuthorSettings();
  return typeof settings.language === 'string' ? settings.language : null;
}

export async function setWritingLanguage(language: string): Promise<void> {
  const settings = await readAuthorSettings();
  await writeAuthorSettings({ ...settings, language });
}

export async function getUiSchema(): Promise<string | null> {
  const settings = await readAuthorSettings();
  return typeof settings.uiSchema === 'string' ? settings.uiSchema : null;
}

export async function setUiSchema(schema: string): Promise<void> {
  const settings = await readAuthorSettings();
  await writeAuthorSettings({ ...settings, uiSchema: schema });
}