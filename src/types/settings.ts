// src/types/settings.ts

/**
 * Validation result for API key input.
 *
 * - `ok`: Valid API key format
 * - `error`: Invalid format or save error
 * - `empty`: No key provided
 */
export type ApiKeyValidation =
  | { state: 'ok'; text?: string }
  | { state: 'error'; text?: string }
  | { state: 'empty'; text?: string };
