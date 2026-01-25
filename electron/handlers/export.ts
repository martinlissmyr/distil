// electron/handlers/export.ts
import { dialog } from 'electron';
import * as fs from 'fs/promises';
import { validateProjectId, validateStoryId } from '../validation';
import { safeHandle } from '../utils/ipcHandler';
import { loadStoryMetadata, loadPartDoc } from '../fs/fs';
import { exportToDocx } from '../export/docxExporter';

/**
 * Merged part structure matching src/export/storyMerger.ts
 */
interface MergedPart {
  partId: string;
  partIndex: number;
  partTitle: string;
  content: any; // JSONContent
}

/**
 * Merged story structure matching src/export/storyMerger.ts
 */
interface MergedStory {
  title: string;
  parts: MergedPart[];
  metadata: any; // StoryMetadata
}

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

        return {
          partId: part.id,
          partIndex: index,
          partTitle: getPartTitle(index, sortedParts.length),
          content: { type: 'doc', content },
        } satisfies MergedPart;
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

/**
 * Show save dialog and return selected path
 */
async function showSaveDialog(
  storyTitle: string,
  format: 'docx' | 'pdf'
): Promise<string | null> {
  const filters =
    format === 'docx'
      ? [{ name: 'Word Document', extensions: ['docx'] }]
      : [{ name: 'PDF Document', extensions: ['pdf'] }];

  const { filePath } = await dialog.showSaveDialog({
    title: `Export Story as ${format.toUpperCase()}`,
    defaultPath: `${storyTitle}.${format}`,
    filters,
  });

  return filePath || null;
}

/**
 * Complete export flow - merges story, shows dialog, generates DOCX, and saves file
 * All happens in the main process for better performance and reliability
 */
async function exportStoryToDocx(
  projectId: string,
  storyId: string
): Promise<{ success: boolean; filePath?: string; cancelled?: boolean }> {
  // Step 1: Merge story parts
  const mergedStory = await mergeStoryParts(projectId, storyId);

  // Step 2: Show save dialog
  const filePath = await showSaveDialog(mergedStory.title, 'docx');

  if (!filePath) {
    return { success: false, cancelled: true };
  }

  // Step 3: Generate DOCX
  const buffer = await exportToDocx(mergedStory);

  // Step 4: Save to disk
  await fs.writeFile(filePath, buffer);

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
    return await exportStoryToDocx(projectId, storyId);
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
