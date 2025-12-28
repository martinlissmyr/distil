// src/components/settings/utils.ts
import type { ApiKeyValidation } from '../../types/settings';

/**
 * Validates OpenAI API key format.
 *
 * @param v - The API key string to validate
 * @returns Validation result with state and optional error message
 *
 * Rules:
 * - Empty/whitespace → `empty` state
 * - Must start with "sk-" → `error` if not
 * - Otherwise → `ok`
 */
export const validateApiKey = (v: string): ApiKeyValidation => {
  const trimmed = v.trim();

  if (!trimmed) {
    return {
      state: 'empty',
      text: 'No API key set',
    };
  }

  if (!trimmed.startsWith('sk-')) {
    return {
      state: 'error',
      text: 'OpenAI API keys must start with "sk-"',
    };
  }

  return { state: 'ok' };
};
