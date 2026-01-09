/**
 * Projection Utilities
 *
 * Reusable functions for generating chapter projection summaries using LLM.
 * Used by ProjectionGenerationService and playground summarization tester.
 */

import projectionSystemPromptMd from '../chat/prompts/projectionGenerationSystemPrompt.md?raw';
import { interpolate } from '../helpers/interpolate';

export type ProjectionSummaryResult = {
  systemPrompt: string;
  assistantPrompt: string;
  userPrompt: string;
  summary: string;
  error?: string;
};

/**
 * Returns the system prompt for projection generation.
 * Currently returns the imported markdown prompt directly.
 * Future-proofed: could later add template interpolation if needed.
 */
export function getProjectionSystemPrompt(): string {
  return projectionSystemPromptMd;
}

/**
 * Builds the user prompt from chapter markdown content.
 * Currently returns the markdown directly.
 * Future-proofed: could later use a template wrapper if needed.
 */
export function getProjectionUserPrompt(markdown: string): string {
  return markdown;
}

/**
 * Builds the assistant prompt with optional context (previous part and characters).
 */
export function getProjectionAssistantPrompt(
  previousProjection?: string,
  characterProjections?: string
): string {
  const assistantTemplate =
    '{{#if previousProjection}}Previous chapter summary:\n\n{{previousProjection}}{{/if}}' +
    '{{#if characterProjections}}\n\nPrimary Characters:\n\n{{characterProjections}}{{/if}}';

  const assistantContent = interpolate(assistantTemplate, {
    previousProjection: previousProjection || '',
    characterProjections: characterProjections || ''
  });

  return assistantContent;
}

/**
 * Loads the projection summary from the previous part (if it exists and has a projection).
 *
 * @param parts - Array of PartIndexEntry from story metadata
 * @param currentPartId - The ID of the current part
 * @returns The previous part's projection summary, or undefined if not available
 */
export async function loadPreviousProjection(
  parts: import('../models/story').PartIndexEntry[],
  currentPartId: string
): Promise<string | undefined> {
  const { getPreviousPart } = await import('../models/story');

  const previousPart = getPreviousPart(parts, currentPartId);

  if (
    previousPart?.projection?.summary &&
    previousPart.projection.summary.trim().length > 0
  ) {
    return previousPart.projection.summary;
  }

  return undefined;
}

/**
 * Loads and generates projection markdown for all primary characters in a story.
 *
 * @param projectId - Project ID
 * @param storyId - Story ID
 * @returns Combined markdown of all primary character projections, or empty string if none
 */
export async function loadPrimaryCharacterProjections(
  projectId: string,
  storyId: string
): Promise<string> {
  try {
    const { client } = await import('../api/client');
    const { buildEntityProjectionMarkdown, loadProjectionTemplate } = await import('../helpers/entityProjectionUtils');
    const { characterType } = await import('../models/entities/schemas/character');

    // Load character entity index
    const indexResponse = await client.loadEntityIndex(projectId, storyId, 'character');

    if (!indexResponse.ok || !indexResponse.data) {
      return '';
    }

    // Load projection template
    const template = await loadProjectionTemplate('character');

    // Load and generate projection for each character entry
    const characterMarkdowns: string[] = [];

    for (const charEntry of indexResponse.data.entities) {
      try {
        const charDocResponse = await client.loadEntityDoc(
          projectId,
          storyId,
          'character',
          charEntry.id
        );

        if (charDocResponse.ok && charDocResponse.data) {
          const charDoc = charDocResponse.data as import('../models/entities/schemas/character').CharacterDoc;

          // Only include primary tier characters
          if (charDoc.tier === 'primary') {
            const charMarkdown = buildEntityProjectionMarkdown(
              charDoc,
              characterType,
              template
            );
            characterMarkdowns.push(charMarkdown);
          }
        }
      } catch (charError) {
        console.error(
          `Failed to load character ${charEntry.id} for projection: ${
            charError instanceof Error ? charError.message : String(charError)
          }`
        );
        // Continue with other characters
      }
    }

    if (characterMarkdowns.length > 0) {
      return characterMarkdowns.join('\n\n');
    }

    return '';
  } catch (error) {
    console.error(
      `Failed to load character projections: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return '';
  }
}


/**
 * Generates a projection summary for the given chapter markdown.
 *
 * @param markdown - The chapter content in markdown format
 * @param previousProjection - Optional summary from the previous chapter for context
 * @param characterProjections - Optional primary character projections for context
 * @returns Object containing prompts used, generated summary, and optional error
 */
export async function generateProjectionSummary(
  markdown: string,
  previousProjection?: string,
  characterProjections?: string
): Promise<ProjectionSummaryResult> {
  const systemPrompt = getProjectionSystemPrompt();
  const userPrompt = getProjectionUserPrompt(markdown);
  const assistantPrompt = getProjectionAssistantPrompt(previousProjection, characterProjections);

  // Build messages array with optional assistant message for previous projection and characters
  const messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  console.log(`SYSTEM PROMPT:\n\n${systemPrompt}`);

  // Add assistant message with context if either previous projection or character projections provided
  if (
    (previousProjection && previousProjection.trim().length > 0) ||
    (characterProjections && characterProjections.trim().length > 0)
  ) {
    messages.push({ role: 'assistant', content: assistantPrompt });
  }

  console.log(`ASSISTANT PROMPT:\n\n${assistantPrompt}`);

  messages.push({ role: 'user', content: userPrompt });

  console.log(`USER PROMPT:\n\n${userPrompt}`);

  try {
    const response = await window.chat.send({
      messages,
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 600
    });

    if (!response.ok) {
      return {
        systemPrompt,
        assistantPrompt,
        userPrompt,
        summary: '',
        error: response.error || 'Unknown error occurred'
      };
    }

    return {
      systemPrompt,
      assistantPrompt,
      userPrompt,
      summary: response.data.output_text.trim()
    };
  } catch (err) {
    return {
      systemPrompt,
      assistantPrompt,
      userPrompt,
      summary: '',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
