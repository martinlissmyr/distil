// src/helpers/entityProjectionUtils.ts
import type { DocumentTypeDef } from '../models/entities/schemas/types';
import { getNestedValue } from './nestedObjectUtils';
import { interpolate } from './interpolate';

/**
 * Entity Projection System
 *
 * This system enables AI-friendly markdown generation from entity documents.
 * It works in three stages:
 *
 * 1. **buildEntityProjection**: Extract relevant fields from entity doc based on schema
 * 2. **flattenForInterpolation**: Convert nested projection to flat key-value pairs
 * 3. **buildEntityProjectionMarkdown**: Interpolate values into markdown template
 *
 * Example flow:
 * - Entity doc: { identity: { name: "John", age: 25 }, tier: "primary" }
 * - Projection: { identity: { name: "John", age: 25 }, tier: "primary" }
 * - Flattened: { "identity.name": "John", name: "John", "identity.age": 25, age: 25, tier: "primary" }
 * - Template: "# {{name}}\n{{#if hasContent(age)}}Age: {{age}}{{/if}}"
 * - Output: "# John\nAge: 25"
 */

/**
 * Builds a projection object from an entity document based on schema fields
 * marked with includeInProjection: true.
 *
 * This extracts only the fields that should be included in AI context,
 * preserving the nested structure from the schema.
 *
 * @example
 * const projection = buildEntityProjection(characterDoc, characterSchema);
 * // Returns:
 * // {
 * //   identity: { name: "John", age: "25", gender: "male" },
 * //   tier: "primary",
 * //   roleInStory: "protagonist"
 * // }
 *
 * @param entityDoc - The full entity document
 * @param schema - The entity schema definition
 * @returns Nested projection object with only included fields
 */
export function buildEntityProjection(
  entityDoc: Record<string, any>,
  schema: DocumentTypeDef<any>
): Record<string, any> {
  const projection: Record<string, any> = {};

  for (const field of schema.fields) {
    if (!field.includeInProjection) continue;

    const value = getNestedValue(entityDoc, field.name);
    if (value === undefined || value === null || value === '') continue;

    // Set nested value in projection
    const keys = field.name.split('.');
    let current = projection;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  return projection;
}

/**
 * Flattens a nested projection object for template interpolation.
 *
 * Creates both fully-qualified paths (e.g., "identity.name") and short keys
 * (e.g., "name") for convenient access in templates. Short keys are only added
 * if they don't conflict with existing keys at the root level.
 *
 * @example
 * const flattened = flattenForInterpolation(
 *   { identity: { name: "John", age: 25 }, tier: "primary" },
 *   entityDoc
 * );
 * // Returns:
 * // {
 * //   "identity.name": "John",
 * //   "name": "John",
 * //   "identity.age": 25,
 * //   "age": 25,
 * //   "tier": "primary"
 * // }
 *
 * @param projection - The nested projection object
 * @param entityDoc - The original entity document (for nested value lookups)
 * @returns Flattened object with both nested paths and short keys
 */
function flattenForInterpolation(
  projection: Record<string, any>,
  entityDoc: Record<string, any>
): Record<string, any> {
  const flattened: Record<string, any> = {};
  const shortKeysSeen = new Set<string>();

  function traverse(obj: any, path: string[] = []) {
    for (const key in obj) {
      const value = obj[key];
      const newPath = [...path, key];
      const fullKey = newPath.join('.');

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse
        traverse(value, newPath);
      } else {
        // Leaf value - add to flattened
        flattened[fullKey] = value;

        // Add short key if not already present (avoid conflicts)
        const shortKey = newPath[newPath.length - 1];
        if (!shortKeysSeen.has(shortKey)) {
          flattened[shortKey] = value;
          shortKeysSeen.add(shortKey);
        }
      }
    }
  }

  traverse(projection);
  return flattened;
}

/**
 * Builds markdown representation of an entity using a template.
 *
 * This is the main function for generating AI-friendly context from entity documents.
 * It combines projection extraction, flattening, and template interpolation.
 *
 * The template can use:
 * - Variable substitution: {{name}}, {{identity.name}}
 * - Conditional blocks: {{#if hasContent(age)}}Age: {{age}}{{/if}}
 * - Logical operators: {{#if tier && hasContent(roleInStory)}}...{{/if}}
 *
 * @example
 * const markdown = buildEntityProjectionMarkdown(
 *   characterDoc,
 *   characterSchema,
 *   "# {{name}}\n{{#if hasContent(age)}}Age: {{age}}{{/if}}"
 * );
 * // Returns: "# John\nAge: 25"
 *
 * @param entityDoc - The full entity document
 * @param schema - The entity schema definition
 * @param template - Markdown template string with variable placeholders
 * @returns Interpolated markdown string
 */
export function buildEntityProjectionMarkdown(
  entityDoc: Record<string, any>,
  schema: DocumentTypeDef<any>,
  template: string
): string {
  // Build nested projection
  const projection = buildEntityProjection(entityDoc, schema);

  // Flatten for interpolation
  const flattened = flattenForInterpolation(projection, entityDoc);

  // Create hasContent resolver
  const hasContentResolver = (key: string): boolean => {
    const value = flattened[key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  // Interpolate template
  return interpolate(template, flattened, hasContentResolver);
}

/**
 * Template cache for projection templates.
 * Maps entity type to loaded template string.
 */
const templateCache = new Map<string, string>();

/**
 * Loads a projection template for an entity type.
 *
 * Templates are stored in src/models/entities/projectionTemplates/{entityType}.md
 * and are cached after first load for performance.
 *
 * @example
 * const template = await loadProjectionTemplate('character');
 * // Returns: "# {{name}}\n{{#if hasContent(age)}}Age: {{age}}{{/if}}..."
 *
 * @param entityType - The entity type (e.g., 'character', 'location')
 * @returns Promise resolving to the template string
 * @throws Error if template file cannot be loaded
 */
export async function loadProjectionTemplate(entityType: string): Promise<string> {
  // Check cache first
  if (templateCache.has(entityType)) {
    return templateCache.get(entityType)!;
  }

  // Load from file
  const templatePath = `/src/models/entities/projectionTemplates/${entityType}.md`;

  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template for ${entityType}: ${response.statusText}`);
    }

    const template = await response.text();

    // Cache for future use
    templateCache.set(entityType, template);

    return template;
  } catch (error) {
    throw new Error(
      `Failed to load projection template for entity type "${entityType}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
