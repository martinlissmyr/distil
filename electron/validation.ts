// electron/validation.ts
// Input validation utilities for IPC handlers

/**
 * Validates a project ID format
 * Accepts: alphanumeric characters, dashes, underscores (e.g., "project-123", "default")
 * Blocks: path traversal attempts and special characters
 */
export function validateProjectId(id: unknown): asserts id is string {
  if (typeof id !== 'string') {
    throw new Error('Project ID must be a string');
  }
  if (!id || id.trim().length === 0) {
    throw new Error('Project ID cannot be empty');
  }
  // Allow alphanumeric, dash, underscore only (for backward compatibility)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid project ID: contains invalid characters');
  }
  // Check for path traversal attempts
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw new Error('Invalid project ID: contains path separators');
  }
}

/**
 * Validates a story ID format
 * Accepts: alphanumeric characters, dashes, underscores (e.g., "story-123")
 * Blocks: path traversal attempts and special characters
 */
export function validateStoryId(id: unknown): asserts id is string {
  if (typeof id !== 'string') {
    throw new Error('Story ID must be a string');
  }
  if (!id || id.trim().length === 0) {
    throw new Error('Story ID cannot be empty');
  }
  // Allow alphanumeric, dash, underscore only (for backward compatibility)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid story ID: contains invalid characters');
  }
  // Check for path traversal attempts
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw new Error('Invalid story ID: contains path separators');
  }
}

/**
 * Validates a name (project name, story title, etc.)
 */
export function validateName(name: unknown, maxLength = 200): asserts name is string {
  if (typeof name !== 'string') {
    throw new Error('Name must be a string');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Name cannot be empty');
  }
  if (trimmed.length > maxLength) {
    throw new Error(`Name too long (max ${maxLength} characters)`);
  }
}

/**
 * Validates a metaDoc key (brief, outline, manifest, etc.)
 */
export function validateMetaDocKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error('MetaDoc key must be a string');
  }
  if (!key || key.trim().length === 0) {
    throw new Error('MetaDoc key cannot be empty');
  }
  // Only allow alphanumeric, dash, underscore
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error('MetaDoc key contains invalid characters');
  }
  // Check for path traversal
  if (key.includes('/') || key.includes('\\') || key.includes('..')) {
    throw new Error('Invalid metaDoc key: contains path separators');
  }
}

/**
 * Validates an array of IDs for reordering operations
 */
export function validateIdArray(ids: unknown): asserts ids is string[] {
  if (!Array.isArray(ids)) {
    throw new Error('IDs must be an array');
  }
  if (ids.length === 0) {
    throw new Error('ID array cannot be empty');
  }
  for (const id of ids) {
    if (typeof id !== 'string') {
      throw new Error('All IDs must be strings');
    }
  }
}

/**
 * Validates an API key
 */
export function validateApiKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    throw new Error('API key must be a string');
  }
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    throw new Error('API key cannot be empty');
  }
  // OpenAI keys start with "sk-"
  if (!trimmed.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }
}

/**
 * Validates a JSON document (basic check)
 */
export function validateJsonDoc(doc: unknown): asserts doc is object {
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('Document must be a valid JSON object');
  }
}

/**
 * Sanitizes an ID by checking it doesn't contain path separators
 * Use this before constructing file paths
 */
export function sanitizeId(id: string): string {
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw new Error('Invalid ID: contains path separators');
  }
  return id;
}

/**
 * Validates a writing language.
 * UI language is always English, but writing output can be in supported languages.
 */
export function validateWritingLanguage(lang: unknown): asserts lang is string {
  if (typeof lang !== 'string') {
    throw new Error('Writing language must be a string');
  }

  const trimmed = lang.trim();
  if (!trimmed) {
    throw new Error('Writing language cannot be empty');
  }

  // Keep this intentionally simple and explicit.
  // Add more later (e.g. 'no', 'da', etc).
  const supported = new Set(['sv', 'en']);

  if (!supported.has(trimmed)) {
    throw new Error(`Unsupported writing language: ${trimmed}`);
  }
}
