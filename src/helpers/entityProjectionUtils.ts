// src/helpers/entityProjectionUtils.ts
import type { DocumentTypeDef } from '../models/entities/schemas/types';
import { interpolate } from './interpolate';

/**
 * Entity Projection System
 *
 * This system enables AI-friendly markdown generation from entity documents.
 * It works in three stages:
 *
 * 1. **buildEntityProjection**: Extract relevant fields from entity doc based on schema
 * 2. **flattenForInterpolation**: Prepare projection for template interpolation
 * 3. **buildEntityProjectionMarkdown**: Interpolate values into markdown template
 *
 * Example flow:
 * - Entity doc: { name: "John", age: 25, tier: "primary" }
 * - Projection: { name: "John", age: 25, tier: "primary" }
 * - Flattened: { name: "John", age: 25, tier: "primary" }
 * - Template: "# {{name}}\n{{#if hasContent(age)}}Age: {{age}}{{/if}}"
 * - Output: "# John\nAge: 25"
 */

/**
 * Gets the primary title value from an entity document using the schema's fieldRole.
 * Looks for the field marked with fieldRole: 'primaryTitle' in the schema.
 * Falls back to 'Untitled' if no primaryTitle field is found or if the value is empty.
 *
 * @example
 * getPrimaryTitleValue(characterDoc, characterSchema) // returns "John Smith"
 * getPrimaryTitleValue({}, characterSchema) // returns "Untitled"
 *
 * @param entityDoc - The entity document
 * @param schema - The DocumentTypeDef schema
 * @returns The primary title string
 */
export function getPrimaryTitleValue(
  entityDoc: Record<string, any>,
  schema: DocumentTypeDef<any>
): string {
  // Find field with primaryTitle role
  const titleField = schema.fields.find(f => f.fieldRole === 'primaryTitle');

  if (!titleField) return 'Untitled';

  const value = entityDoc[titleField.name];

  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return 'Untitled';
  }

  return String(value);
}

/**
 * Builds a projection object from an entity document based on schema fields
 * marked with includeInProjection: true.
 *
 * This extracts only the fields that should be included in AI context.
 *
 * @example
 * const projection = buildEntityProjection(characterDoc, characterSchema);
 * // Returns:
 * // {
 * //   name: "John",
 * //   age: "25",
 * //   gender: "male",
 * //   tier: "primary",
 * //   roleInStory: "protagonist"
 * // }
 *
 * @param entityDoc - The full entity document
 * @param schema - The entity schema definition
 * @returns Projection object with only included fields
 */
export function buildEntityProjection(
  entityDoc: Record<string, any>,
  schema: DocumentTypeDef<any>
): Record<string, any> {
  const projection: Record<string, any> = {};

  for (const field of schema.fields) {
    if (!field.includeInProjection) continue;

    const value = entityDoc[field.name];
    if (value === undefined || value === null || value === '') continue;

    projection[field.name] = value;
  }

  return projection;
}

/**
 * Prepares a projection object for template interpolation.
 *
 * Since projections are now flat, this simply returns a copy of the projection.
 *
 * @example
 * const flattened = flattenForInterpolation(
 *   { name: "John", age: 25, tier: "primary" }
 * );
 * // Returns:
 * // {
 * //   name: "John",
 * //   age: 25,
 * //   tier: "primary"
 * // }
 *
 * @param projection - The projection object
 * @returns Copy of the projection object
 */
function flattenForInterpolation(
  projection: Record<string, any>
): Record<string, any> {
  return { ...projection };
}

/**
 * Builds markdown representation of an entity using a template.
 *
 * This is the main function for generating AI-friendly context from entity documents.
 * It combines projection extraction and template interpolation.
 *
 * The template can use:
 * - Variable substitution: {{name}}, {{age}}
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
  // Build projection
  const projection = buildEntityProjection(entityDoc, schema);

  // Prepare for interpolation
  const flattened = flattenForInterpolation(projection);

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
