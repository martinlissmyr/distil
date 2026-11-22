// src/services/ProjectionGenerationService.ts
import { useAppStore } from '../state/useAppStore';
import { client } from '../api/client';
import { proseJsonToMarkdown } from '../helpers/markdownUtils';
import { shouldGenerateProjection } from '../models/story';
import {
  generateProjectionSummary,
  loadPreviousProjection,
  loadPrimaryCharacterProjections
} from './projectionUtils';

/**
 * Generates part projections (summaries) when the user opens Chapters Overview.
 *
 * Projections are used in the chapter overview to show what each part contains
 * without loading full part documents.
 */
class ProjectionGenerationService {
  /**
   * Generates a projection for a specific part.
   * Only regenerates if the projection is stale.
   */
  public async generateForPart(projectId: string, storyId: string, partId: string): Promise<void> {
    const { currentStoryMetadata } = useAppStore.getState();

    if (!currentStoryMetadata) {
      return;
    }

    // Find the part in metadata
    const part = currentStoryMetadata.parts.find(p => p.id === partId);
    if (!part) {
      console.warn(`[ProjectionService] Part ${partId} not found in metadata`);
      return;
    }

    // Check if projection should be generated (word count + staleness)
    if (!shouldGenerateProjection(part)) {
      console.log(`[ProjectionService] Skipping projection for part ${partId} (insufficient content or up-to-date)`);
      return;
    }

    console.log(`[ProjectionService] Generating projection for part ${partId}`);
    await this.generateProjection(projectId, storyId, partId);
  }

  /** Refreshes every stale, eligible chapter summary in order. */
  public async generateForStory(projectId: string, storyId: string): Promise<void> {
    const metadata = useAppStore.getState().currentStoryMetadata;
    if (!metadata || metadata.id !== storyId) return;

    // Generate serially: each summary is saved before the next uses it as context.
    for (const partId of metadata.parts.map((part) => part.id)) {
      await this.generateForPart(projectId, storyId, partId);
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

    // Convert to markdown
    const markdown = proseJsonToMarkdown(doc);

    // Load previous part's projection (if available)
    const previousProjection = await loadPreviousProjection(
      currentStoryMetadata.parts,
      partId
    );

    // Load primary character projections for context
    const characterProjections = await loadPrimaryCharacterProjections(
      projectId,
      storyId
    );

    // Generate projection using LLM (with optional previous projection and character context)
    const result = await generateProjectionSummary(
      markdown,
      previousProjection,
      characterProjections || undefined
    );

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
