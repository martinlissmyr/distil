// src/export/exportOrchestrator.ts
import { client, type IpcResponse } from '../api/client';
import type { ExportStatus } from '../ui/modals/ExportProgressModal';
import type { ExportFormat } from '../models/export';

export interface ExportProgress {
  status: ExportStatus;
  errorMessage?: string;
  cancelled?: boolean;
}

type ExportResult = { success: boolean; filePath?: string; cancelled?: boolean };

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
  const response = format === 'docx'
    ? client.exportToDocx(projectId, storyId)
    : client.exportToPdf(projectId, storyId);
  await runExport(response, onProgress);
}

export async function exportProject(
  projectId: string,
  format: ExportFormat,
  onProgress: (progress: ExportProgress) => void
): Promise<void> {
  const response = format === 'docx'
    ? client.exportProjectToDocx(projectId)
    : client.exportProjectToPdf(projectId);
  await runExport(response, onProgress);
}

async function runExport(
  operation: Promise<IpcResponse<ExportResult>>,
  onProgress: (progress: ExportProgress) => void
): Promise<void> {
  try {
    onProgress({ status: 'loading' });
    const response = await operation;

    if (!response.ok) {
      throw new Error(response.error);
    }

    const result = response.data;

    // User cancelled the save dialog
    if (result.cancelled) {
      onProgress({ status: 'complete', cancelled: true });
      return;
    }

    if (!result.success) throw new Error('Export failed');

    // Success
    console.log('[Export] Export complete! File saved to:', result.filePath);
    onProgress({ status: 'complete' });

  } catch (error) {
    console.error('[Export] Export failed:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    onProgress({ status: 'error', errorMessage });
  }
}
