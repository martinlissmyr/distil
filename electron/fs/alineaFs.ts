// electron/fs/alineaFs.ts
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import type { JSONContent } from '@tiptap/react';

export type ProjectMeta = {
  id: string;
  name: string;
  createdAt: string;
  order: number;
};

export type StoryMeta = {
  id: string;
  title: string;
  createdAt: string;
  order: number;
};

export type ManifestData = {
  doc: JSONContent;
  updatedAt: string;
};

const getRootDir = () => {
  const home =
    process.env.HOME || process.env.USERPROFILE || app.getPath('home');
  return path.join(home, 'Alinea');
};

const getManifestFile = () => path.join(getRootDir(), 'manifest.json');

const getProjectsDir = () => path.join(getRootDir(), 'projects');

const getProjectDir = (projectId: string) =>
  path.join(getProjectsDir(), projectId);

const getProjectFile = (projectId: string) =>
  path.join(getProjectDir(projectId), 'project.json');

const getStoriesDir = (projectId: string) =>
  path.join(getProjectDir(projectId), 'stories');

const getStoryFile = (projectId: string, storyId: string) =>
  path.join(getStoriesDir(projectId), `${storyId}.json`);

// ---- Projects ----

export async function listProjects(): Promise<ProjectMeta[]> {
  const dir = getProjectsDir();
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const projects: ProjectMeta[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pid = entry.name;
      const file = getProjectFile(pid);
      try {
        const raw = await fs.readFile(file, 'utf-8');
        const data = JSON.parse(raw) as ProjectMeta;
        projects.push(data);
      } catch {
        // ignore broken projects
      }
    }
    projects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return projects;
  } catch {
    return [];
  }
}

export async function createProject(name: string): Promise<ProjectMeta> {
  const dir = getProjectsDir();
  await fs.mkdir(dir, { recursive: true });

  const existing = await listProjects();
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((p) => p.order ?? 0)) : 0;

  const id = `project-${Date.now()}`;
  const pdir = getProjectDir(id);
  await fs.mkdir(pdir, { recursive: true });
  await fs.mkdir(getStoriesDir(id), { recursive: true });

  const project: ProjectMeta = {
    id,
    name,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1,
  };

  await fs.writeFile(getProjectFile(id), JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<ProjectMeta, 'name'>>
): Promise<ProjectMeta> {
  const file = getProjectFile(projectId);
  const raw = await fs.readFile(file, 'utf-8');
  const existing = JSON.parse(raw) as ProjectMeta;
  const updated: ProjectMeta = { ...existing, ...updates };
  await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function deleteProject(projectId: string): Promise<void> {
  const dir = getProjectDir(projectId);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function reorderProjects(idsInOrder: string[]): Promise<void> {
  const projects = await listProjects();
  const byId = new Map(projects.map((p) => [p.id, p]));

  let index = 0;
  for (const id of idsInOrder) {
    const p = byId.get(id);
    if (!p) continue;
    p.order = index++;
    await fs.writeFile(getProjectFile(id), JSON.stringify(p, null, 2), 'utf-8');
  }
}

// ---- Stories ----

export async function listStories(projectId: string): Promise<StoryMeta[]> {
  const dir = getStoriesDir(projectId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const stories: StoryMeta[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const fullPath = path.join(dir, entry.name);
      const raw = await fs.readFile(fullPath, 'utf-8');
      const json = JSON.parse(raw) as any;
      stories.push({
        id: json.id,
        title: json.title,
        createdAt: json.createdAt ?? new Date().toISOString(),
        order: json.order ?? 0,
      });
    }
    stories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return stories;
  } catch {
    return [];
  }
}

export async function createStory(
  projectId: string,
  title: string
): Promise<StoryMeta> {
  const existing = await listStories(projectId);
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((s) => s.order ?? 0)) : 0;

  const id = `story-${Date.now()}`;
  const file = getStoryFile(projectId, id);
  await fs.mkdir(getStoriesDir(projectId), { recursive: true });

  const emptyDoc: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };

  const story = {
    id,
    title,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1,
    doc: emptyDoc,
    outlineDoc: emptyDoc,
    briefDoc: emptyDoc,
  };

  await fs.writeFile(file, JSON.stringify(story, null, 2), 'utf-8');

  return {
    id,
    title,
    createdAt: story.createdAt,
    order: story.order,
  };
}

export async function loadStory(projectId: string, storyId: string) {
  const file = getStoryFile(projectId, storyId);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

export async function saveStory(
  projectId: string,
  storyId: string,
  payload: {
    id: string;
    title: string;
    doc: JSONContent;
    outlineDoc?: JSONContent;
    briefDoc?: JSONContent;
  }
) {
  const file = getStoryFile(projectId, storyId);
  const raw = await fs.readFile(file, 'utf-8').catch(() => null);
  let existing: any =
    raw != null ? JSON.parse(raw) : { id: storyId, createdAt: new Date().toISOString() };

  const story = {
    ...existing,
    id: payload.id,
    title: payload.title,
    doc: payload.doc,
    // keep old outline/brief if not provided
    outlineDoc: payload.outlineDoc ?? existing.outlineDoc,
    briefDoc: payload.briefDoc ?? existing.briefDoc,
  };

  await fs.mkdir(getStoriesDir(projectId), { recursive: true });
  await fs.writeFile(file, JSON.stringify(story, null, 2), 'utf-8');
}

export async function updateStory(
  projectId: string,
  storyId: string,
  updates: Partial<Pick<StoryMeta, 'title'>>
): Promise<StoryMeta> {
  const file = getStoryFile(projectId, storyId);
  const raw = await fs.readFile(file, 'utf-8');
  const existing = JSON.parse(raw) as any;

  const updated = {
    ...existing,
    ...updates,
  };

  await fs.writeFile(file, JSON.stringify(updated, null, 2), 'utf-8');

  // Return StoryMeta shape so list / UI stays consistent
  return {
    id: updated.id,
    title: updated.title,
    createdAt: updated.createdAt ?? new Date().toISOString(),
    order: updated.order ?? 0,
  };
}

export async function deleteStory(
  projectId: string,
  storyId: string
): Promise<void> {
  const file = getStoryFile(projectId, storyId);
  // Remove the story file itself
  await fs.rm(file, { force: true });
}

export async function reorderStories(
  projectId: string,
  idsInOrder: string[]
): Promise<void> {
  const stories = await listStories(projectId);
  const byId = new Map(stories.map((s) => [s.id, s]));

  let index = 0;
  for (const id of idsInOrder) {
    const s = byId.get(id);
    if (!s) continue;
    s.order = index++;

    const file = getStoryFile(projectId, id);
    const raw = await fs.readFile(file, 'utf-8');
    const json = JSON.parse(raw) as any;
    json.order = s.order;
    await fs.writeFile(file, JSON.stringify(json, null, 2), 'utf-8');
  }
}

// ---- Manifest ----

export async function loadManifest(): Promise<ManifestData> {
  const file = getManifestFile();

  try {
    const raw = await fs.readFile(file, 'utf-8');
    const json = JSON.parse(raw) as ManifestData;

    return {
      doc: json.doc,
      updatedAt: json.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    // If it doesn't exist yet, return an empty doc
    const empty: ManifestData = {
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '' }],
          },
        ],
      },
      updatedAt: new Date().toISOString(),
    };
    await fs.mkdir(getRootDir(), { recursive: true });
    await fs.writeFile(file, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
}

export async function saveManifest(payload: {
  doc: JSONContent;
}): Promise<void> {
  const file = getManifestFile();

  const manifest: ManifestData = {
    doc: payload.doc,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(getRootDir(), { recursive: true });
  await fs.writeFile(file, JSON.stringify(manifest, null, 2), 'utf-8');
}