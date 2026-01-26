// electron/handlers/export.ts
import { dialog } from 'electron';
import * as fs from 'fs/promises';
import { validateProjectId, validateStoryId } from '../validation';
import { safeHandle } from '../utils/ipcHandler';
import { loadStoryMetadata, loadPartDoc } from '../fs/fs';
import { exportToDocx } from '../export/docxExporter';
import { exportToPdf } from '../export/pdfExporter';
import type { MergedPart, MergedStory } from '../../src/models/export';

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
   * IPC Handler: Export story to PDF
   * Merges parts, shows save dialog, generates PDF, and saves to disk
   */
  safeHandle('export:exportToPdf', async (projectId: string, storyId: string) => {
    console.log('[PDF-HANDLER] Handler called with:', { projectId, storyId });

    // Validate inputs
    if (!projectId || !storyId) {
      console.log('[PDF-HANDLER] Validation failed - missing projectId or storyId');
      return { success: false, error: 'Missing projectId or storyId' };
    }

    try {
      console.log('[PDF-HANDLER] Starting PDF export for story:', storyId);

      // Merge story parts (reuse existing function)
      console.log('[PDF-HANDLER] About to call mergeStoryParts...');
      const merged = await mergeStoryParts(projectId, storyId);
      console.log('[PDF-HANDLER] mergeStoryParts completed. Parts:', merged.parts.length);
      console.log('[PDF-HANDLER] Merged story title:', merged.title);

      // Show save dialog (reuse existing function)
      console.log('[PDF-HANDLER] About to show save dialog...');
      const savePath = await showSaveDialog(merged.title, 'pdf');
      console.log('[PDF-HANDLER] Save dialog returned. savePath exists:', !!savePath);
      console.log('[PDF-HANDLER] Save path value:', savePath);

      if (!savePath) {
        console.log('[PDF-HANDLER] Export cancelled by user');
        const cancelResponse = { success: true, cancelled: true };
        console.log('[PDF-HANDLER] Returning cancel response:', cancelResponse);
        return cancelResponse;
      }

      // Export to PDF
      console.log('[PDF-HANDLER] About to call exportToPdf with path:', savePath);
      await exportToPdf(merged, savePath);
      console.log('[PDF-HANDLER] exportToPdf completed successfully');

      const successResponse = { success: true, filePath: savePath };
      console.log('[PDF-HANDLER] Returning success response:', successResponse);
      return successResponse;
    } catch (error) {
      console.error('[PDF-HANDLER] PDF export error caught:', error);
      console.error('[PDF-HANDLER] Error type:', error instanceof Error ? 'Error' : typeof error);
      console.error('[PDF-HANDLER] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[PDF-HANDLER] Error stack:', error instanceof Error ? error.stack : 'no stack');

      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during PDF export',
      };
      console.log('[PDF-HANDLER] Returning error response:', errorResponse);
      return errorResponse;
    }
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
