// electron/fs/settings.ts
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';

export type AppSettingsFile = {
  writingLanguage?: string; // validated at handler level
  uiSchema?: string; // validated at handler level
};

const getRootDir = () => {
  const home = process.env.HOME || process.env.USERPROFILE || app.getPath('home');
  return path.join(home, 'Distil');
};

const getSettingsFile = () => path.join(getRootDir(), 'settings.json');

async function readSettingsFile(): Promise<AppSettingsFile> {
  const file = getSettingsFile();

  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as AppSettingsFile;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

async function writeSettingsFile(next: AppSettingsFile): Promise<void> {
  const file = getSettingsFile();
  await fs.mkdir(getRootDir(), { recursive: true });
  await fs.writeFile(file, JSON.stringify(next, null, 2), 'utf-8');
}

export async function getWritingLanguage(): Promise<string | null> {
  const settings = await readSettingsFile();
  return typeof settings.writingLanguage === 'string' ? settings.writingLanguage : null;
}

export async function setWritingLanguage(language: string): Promise<void> {
  const settings = await readSettingsFile();
  await writeSettingsFile({ ...settings, writingLanguage: language });
}

export async function getUiSchema(): Promise<string | null> {
  const settings = await readSettingsFile();
  return typeof settings.uiSchema === 'string' ? settings.uiSchema : null;
}

export async function setUiSchema(schema: string): Promise<void> {
  const settings = await readSettingsFile();
  await writeSettingsFile({ ...settings, uiSchema: schema });
}