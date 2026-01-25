// src/export/exportOrchestrator.ts
import { client } from '../api/client';
import type { ExportStatus } from '../ui/modals/ExportProgressModal';

export type ExportFormat = 'docx' | 'pdf';

export interface ExportProgress {
  status: ExportStatus;
  errorMessage?: string;
}

/**
 * Orchestrates the export process with progress updates
 * Export now happens entirely in the Electron main process
 */
export async function exportStory(
  projectId: string,
  storyId: string,
  format: ExportFormat,
  onProgress: (progress: ExportProgress) => void
): Promise<void> {
  try {
    if (format === 'docx') {
      // Show loading state
      onProgress({ status: 'loading' });
      console.log('[Export] Starting DOCX export...');

      // All the work happens in main process: merge, show dialog, convert, save
      const response = await client.exportToDocx(projectId, storyId);

      if (!response.ok) {
        throw new Error(response.error);
      }

      const result = response.data;

      // User cancelled the save dialog
      if (result.cancelled) {
        console.log('[Export] User cancelled export');
        throw new Error('Export cancelled');
      }

      // Success
      console.log('[Export] Export complete! File saved to:', result.filePath);
      onProgress({ status: 'complete' });

      // Auto-close after showing success briefly
      setTimeout(() => {
        onProgress({ status: 'complete' });
      }, 1500);
    } else {
      // PDF export will be implemented later
      throw new Error('PDF export not yet implemented');
    }
  } catch (error) {
    console.error('[Export] Export failed:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    onProgress({ status: 'error', errorMessage });
  }
}
