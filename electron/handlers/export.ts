// electron/handlers/export.ts
import { dialog } from 'electron';
import * as fs from 'fs/promises';
import { validateProjectId, validateStoryId } from '../validation';
import { safeHandle } from '../utils/ipcHandler';
import { listProjects, listStories, loadStoryMetadata, loadPartDoc } from '../fs/fs';
import { exportProjectToDocx, exportToDocx } from '../export/docxExporter';
import { exportProjectToPdf, exportToPdf } from '../export/pdfExporter';
import type { ExportFormat, MergedPart, MergedProject, MergedStory } from '../../src/models/export';

/**
 * Get chapter title for a part (matches storyMerger.ts logic)
 */
function getPartTitle(partIndex: number, totalParts: number): string {
  if (totalParts <= 1) {
    return '';
  }
  return `Kapitel ${partIndex + 1}`;
}

/**
 * Merge story parts on the Electron side
 * This duplicates the logic from src/export/storyMerger.ts
 * but is necessary because we're in the Node.js context
 */
async function mergeStoryParts(
  projectId: string,
  storyId: string
): Promise<MergedStory> {
  // Load story metadata
  const metadata = await loadStoryMetadata(projectId, storyId);
  const parts = metadata.parts || [];

  // Sort parts by order
  const sortedParts = [...parts].sort((a, b) => a.order - b.order);

  // Load all part documents
  const partResults = await Promise.all(
    sortedParts.map(async (part, index) => {
      try {
        const partDoc = await loadPartDoc(projectId, storyId, part.id);
        const content = partDoc.doc.content ?? [];

        const mergedPart: MergedPart = {
          partId: part.id,
          partIndex: index,
          partTitle: getPartTitle(index, sortedParts.length),
          content: { type: 'doc', content },
        };
        return mergedPart;
      } catch (error) {
        console.error(`[EXPORT] Failed to load part ${part.id}:`, error);
        return null;
      }
    })
  );

  // Filter out failed loads
  const successfulParts = partResults.filter(
    (part): part is MergedPart => part !== null
  );

  return {
    title: metadata.title,
    parts: successfulParts,
    metadata,
  };
}

async function mergeProjectStories(projectId: string): Promise<MergedProject> {
  const project = (await listProjects()).find((item) => item.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const stories = await listStories(projectId);
  return {
    title: project.name,
    stories: await Promise.all(stories.map((story) => mergeStoryParts(projectId, story.id))),
  };
}

/**
 * Show save dialog and return selected path
 */
async function showSaveDialog(
  title: string,
  format: ExportFormat,
  scope: 'Story' | 'Project' = 'Story'
): Promise<string | null> {
  const filters =
    format === 'docx'
      ? [{ name: 'Word Document', extensions: ['docx'] }]
      : [{ name: 'PDF Document', extensions: ['pdf'] }];

  const { filePath } = await dialog.showSaveDialog({
    title: `Export ${scope} as ${format.toUpperCase()}`,
    defaultPath: `${title}.${format}`,
    filters,
  });

  return filePath || null;
}

/** Save a merged story or project through the same local export flow. */
async function exportDocument(
  merged: MergedStory | MergedProject,
  format: ExportFormat
): Promise<{ success: boolean; filePath?: string; cancelled?: boolean }> {
  const isProject = 'stories' in merged;
  const filePath = await showSaveDialog(merged.title, format, isProject ? 'Project' : 'Story');

  if (!filePath) {
    return { success: false, cancelled: true };
  }

  if (format === 'docx') {
    const buffer = isProject ? await exportProjectToDocx(merged) : await exportToDocx(merged);
    await fs.writeFile(filePath, buffer);
  } else if (isProject) {
    await exportProjectToPdf(merged, filePath);
  } else {
    await exportToPdf(merged, filePath);
  }

  return { success: true, filePath };
}

/**
 * Registers IPC handlers for export operations
 */
export function registerExportHandlers(): void {
  /**
   * Export story to DOCX - complete flow in main process
   */
  safeHandle('export:exportToDocx', async (projectId: string, storyId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    return exportDocument(await mergeStoryParts(projectId, storyId), 'docx');
  });

  /** Export the current story to PDF. */
  safeHandle('export:exportToPdf', async (projectId: string, storyId: string) => {
    validateProjectId(projectId);
    validateStoryId(storyId);
    return exportDocument(await mergeStoryParts(projectId, storyId), 'pdf');
  });

  safeHandle('export:projectToDocx', async (projectId: string) => {
    validateProjectId(projectId);
    return exportDocument(await mergeProjectStories(projectId), 'docx');
  });

  safeHandle('export:projectToPdf', async (projectId: string) => {
    validateProjectId(projectId);
    return exportDocument(await mergeProjectStories(projectId), 'pdf');
  });

  /**
   * Get merged story data for export (kept for preview functionality)
   * Returns the merged story structure that can be used by renderer
   */
  safeHandle(
    'export:getMergedStory',
    async (projectId: string, storyId: string) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      return await mergeStoryParts(projectId, storyId);
    }
  );

  /**
   * Show save dialog for export (kept for legacy/manual use)
   */
  safeHandle(
    'export:showSaveDialog',
    async (storyTitle: string, format: 'docx' | 'pdf') => {
      return await showSaveDialog(storyTitle, format);
    }
  );

  /**
   * Save exported file to disk (kept for legacy/manual use)
   */
  safeHandle(
    'export:saveFile',
    async (filePath: string, buffer: Buffer) => {
      await fs.writeFile(filePath, buffer);
      return { success: true };
    }
  );
}
