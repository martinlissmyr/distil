// src/services/ProjectionGenerationService.ts
import { useAppStore } from '../state/useAppStore';
import { client } from '../api/client';
import { proseJsonToMarkdown } from '../helpers/markdownUtils';
import { isProjectionStale, hasContent } from '../models/story';
import { generateProjectionSummary } from './projectionUtils';

/**
 * Background service that generates part projections (summaries):
 * 1. Current part: Only when explicitly triggered (navigation away, opening overview)
 * 2. Background parts: Periodically checks for stale projections and regenerates
 *
 * Projections are used in the chapter overview to show what each part contains
 * without loading full part documents.
 */
class ProjectionGenerationService {
  private checkIntervalId: NodeJS.Timeout | null = null;
  private unsubscribeFromStore: (() => void) | null = null;

  start(): void {
    // Subscribe to store changes (just to track metadata changes for periodic check)
    this.unsubscribeFromStore = useAppStore.subscribe(() => {
      // Could add logic here if needed, but for now just maintain subscription
    });

    // Start periodic check for stale projections
    this.checkIntervalId = setInterval(() => {
      this.periodicCheck();
    }, 30000); // Every 30 seconds
  }

  stop(): void {
    // Unsubscribe from store
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
    }

    // Clear periodic check
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Generates a projection for a specific part.
   * Called explicitly when navigating away from a part or opening chapter overview.
   */
  public async generateForPart(projectId: string, storyId: string, partId: string): Promise<void> {
    console.log(`[ProjectionService] Generating projection for part ${partId}`);
    await this.generateProjection(projectId, storyId, partId);
  }

  private periodicCheck(): void {
    const { currentStoryMetadata, currentPartId } = useAppStore.getState();

    // Only check if story has parts enabled
    if (!currentStoryMetadata || !currentStoryMetadata.partsEnabled) return;

    const projectId = this.getProjectIdFromNavigation();
    const storyId = currentStoryMetadata.id;
    if (!projectId) return;

    // Process all stale parts EXCEPT the current one
    for (const part of currentStoryMetadata.parts) {
      if (part.id === currentPartId) continue; // Skip current part

      if (isProjectionStale(part)) {
        // Generate immediately in background (no queue, no idle wait)
        void this.generateProjection(projectId, storyId, part.id);
      }
    }
  }

  private getProjectIdFromNavigation(): string | null {
    // Read navigation state from localStorage
    const navStateKey = 'Distil:navState:v3';
    const raw = window.localStorage.getItem(navStateKey);
    if (!raw) return null;

    try {
      const navState = JSON.parse(raw);
      return navState.selectedProjectId || null;
    } catch {
      return null;
    }
  }

  private async generateProjection(projectId: string, storyId: string, partId: string): Promise<void> {
    const { currentStoryMetadata } = useAppStore.getState();

    if (!currentStoryMetadata) {
      return;
    }

    // Load part document
    const response = await client.loadPartDoc(projectId, storyId, partId);

    if (!response.ok || !response.data) {
      console.error(`Failed to load part doc for projection generation: ${partId}`);
      return;
    }

    const partDoc = response.data;
    const doc = partDoc.doc;

    // Check if document has content
    if (!hasContent(doc)) {
      return;
    }

    // Convert to markdown
    const markdown = proseJsonToMarkdown(doc);

    // Generate projection using LLM
    const result = await generateProjectionSummary(markdown);

    if (result.error) {
      console.error(`Failed to generate projection for part ${partId}: ${result.error}`);
      return;
    }

    const summary = result.summary;
    console.log(`[ProjectionService] Generated projection for part ${partId}: "${summary.substring(0, 50)}..."`);


    // Update metadata with new projection
    const updatedParts = currentStoryMetadata.parts.map(part => {
      if (part.id === partId) {
        return {
          ...part,
          projection: {
            summary,
            generatedAt: new Date().toISOString()
          }
        };
      }
      return part;
    });

    const updatedMetadata = {
      ...currentStoryMetadata,
      parts: updatedParts,
      updatedAt: new Date().toISOString()
    };

    // Save updated metadata
    const saveResponse = await client.saveStoryMetadata(
      projectId,
      storyId,
      updatedMetadata
    );

    if (saveResponse.ok) {
      console.log(`[ProjectionService] Successfully saved projection for part ${partId}`);
      // Refresh store with updated metadata
      await useAppStore.getState().loadStoryMetadata(projectId, storyId);
    } else {
      console.error(`Failed to save updated metadata for part ${partId}: ${saveResponse.error}`);
    }
  }
}

// Export singleton instance
export const projectionService = new ProjectionGenerationService();
