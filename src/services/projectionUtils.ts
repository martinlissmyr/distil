/**
 * Projection Utilities
 *
 * Reusable functions for generating chapter projection summaries using LLM.
 * Used by ProjectionGenerationService and playground summarization tester.
 */

import projectionPromptMd from '../chat/prompts/projectionGenerationPrompt.md?raw';

export type ProjectionSummaryResult = {
  systemPrompt: string;
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
  return projectionPromptMd;
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
 * Generates a projection summary for the given chapter markdown.
 *
 * @param markdown - The chapter content in markdown format
 * @returns Object containing prompts used, generated summary, and optional error
 */
export async function generateProjectionSummary(
  markdown: string
): Promise<ProjectionSummaryResult> {
  const systemPrompt = getProjectionSystemPrompt();
  const userPrompt = getProjectionUserPrompt(markdown);

  try {
    const response = await window.chat.send({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 200
    });

    if (!response.ok) {
      return {
        systemPrompt,
        userPrompt,
        summary: '',
        error: response.error || 'Unknown error occurred'
      };
    }

    return {
      systemPrompt,
      userPrompt,
      summary: response.data.output_text.trim()
    };
  } catch (err) {
    return {
      systemPrompt,
      userPrompt,
      summary: '',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
