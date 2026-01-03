// src/helpers/entityProjectionUtils.ts
import type { DocumentTypeDef } from '../models/entities/schemas/types';

/**
 * Helper to get nested value from object using dot path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Builds a projection object from an entity document based on schema fields
 * marked with includeInProjection: true.
 *
 * Example output for character:
 * {
 *   identity: { name: "John", age: "25", gender: "male" },
 *   tier: "primary",
 *   roleInStory: "protagonist"
 * }
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
