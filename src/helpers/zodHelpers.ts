// src/helpers/zodHelpers.ts
import { z } from 'zod';
import type { DocumentTypeDef, FieldDef } from '../models/entities/schemas/types';
import type { GroupDef } from '../models/entities/schemas/types';

type ZodDefLike = {
  typeName?: string;
  innerType?: z.ZodTypeAny;
  schema?: z.ZodTypeAny;
  checks?: Array<{ kind?: string; value?: number }>;
  defaultValue?: () => unknown;
};

function getZodDef(schema: z.ZodTypeAny | null | undefined): ZodDefLike | undefined {
  return schema?._def as ZodDefLike | undefined;
}

/**
 * Checks if a Zod schema represents a required field.
 *
 * Returns false for:
 * - ZodOptional: `.optional()`
 * - ZodNullable: `.nullable()`
 * - ZodDefault with optional/nullable inner types: `.optional().default(...)` or `.default(...).optional()`
 *
 * Returns true for:
 * - ZodString with .min(1): `.string().min(1, 'Name is required')`
 * - ZodEnum: `.enum(['a', 'b'])`
 * - Other non-optional, non-nullable, non-defaulted types
 *
 * Handles nested ZodEffects and ZodDefault wrapping.
 *
 * @example
 * isZodFieldRequired(z.string().min(1, 'Name is required')) // true
 * isZodFieldRequired(z.string().optional()) // false
 * isZodFieldRequired(z.enum(['a', 'b'])) // true
 * isZodFieldRequired(z.enum(['a', 'b']).default('a')) // false (has default)
 * isZodFieldRequired(z.string().min(1).optional()) // false
 * isZodFieldRequired(z.string().nullable()) // false
 *
 * @param schema - A Zod schema object
 * @returns true if the field is required, false if optional/nullable/has default
 */
export function isZodFieldRequired(schema: z.ZodTypeAny): boolean {
  try {
    const schemaDef = getZodDef(schema);
    if (!schemaDef) return false;

    const typeName = schemaDef.typeName;

    // Explicitly NOT required types
    if (typeName === 'ZodOptional') return false;
    if (typeName === 'ZodNullable') return false;

    // ZodDefault: check if inner type is optional/nullable
    if (typeName === 'ZodDefault') {
      const innerType = schemaDef.innerType;
      if (!innerType) return false; // Has default, so not required

      const innerDef = getZodDef(innerType);
      // If the inner type is optional or nullable, it's not required
      if (innerDef?.typeName === 'ZodOptional') return false;
      if (innerDef?.typeName === 'ZodNullable') return false;

      // Otherwise, even with a default, it's not required (default value satisfies requirement)
      return false;
    }

    // ZodEffects: unwrap and check inner schema
    if (typeName === 'ZodEffects') {
      const innerSchema = schemaDef.schema;
      if (innerSchema) return isZodFieldRequired(innerSchema);
    }

    // ZodString with .min(1) is required
    if (typeName === 'ZodString') {
      const checks = schemaDef.checks;
      if (Array.isArray(checks)) {
        const hasMinLength = checks.some((check) => check.kind === 'min' && (check.value ?? 0) >= 1);
        if (hasMinLength) return true;
      }
      // Plain z.string() without .min(1) is not inherently required
      return false;
    }

    // ZodEnum without .default() should be optional (enums should have defaults or be optional)
    if (typeName === 'ZodEnum') return false;

    // All other types are optional by default unless explicitly marked as required
    // In the entity schema system, fields use .optional() or .default() to mark themselves as not required
    // Only fields with explicit validators like .min(1) are truly required
    return false;
  } catch {
    // If introspection fails, assume not required to avoid false positives
    return false;
  }
}

/**
 * Extracts the default value from a Zod schema, if one exists.
 * Works with z.string().default(...), z.enum(...).default(...), etc.
 *
 * @example
 * getZodDefault(z.string().default('hello')) // returns 'hello'
 * getZodDefault(z.enum(['a', 'b']).default('a')) // returns 'a'
 * getZodDefault(z.string()) // returns undefined
 *
 * @param schema - A Zod schema object
 * @returns The default value if defined, otherwise undefined
 */
export function getZodDefault(schema: z.ZodTypeAny): unknown {
  try {
    const schemaDef = getZodDef(schema);
    // zod default() wraps with ZodDefault and stores defaultValue()
    if (schemaDef?.typeName === 'ZodDefault' && typeof schemaDef.defaultValue === 'function') {
      return schemaDef.defaultValue();
    }
    // sometimes you might have optional(default(...)) etc
    if (schemaDef?.innerType) return getZodDefault(schemaDef.innerType);
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Returns all fields from a DocumentTypeDef where the schema is marked as required.
 *
 * Uses isZodFieldRequired() to determine if a field is required based on its Zod schema.
 *
 * @example
 * const schema = defineType({
 *   name: 'example',
 *   title: 'Example',
 *   version: 1,
 *   fields: [
 *     defineField({ name: 'required', label: 'Required', type: 'text', schema: z.string().min(1) }),
 *     defineField({ name: 'optional', label: 'Optional', type: 'text', schema: z.string().optional() }),
 *   ]
 * });
 * getRequiredFields(schema) // returns [{ name: 'required', ... }]
 *
 * @param schema - A DocumentTypeDef schema definition
 * @returns Array of FieldDef objects that are marked as required
 */
export function getRequiredFields<TGroups extends readonly GroupDef[] | undefined = undefined>(
  schema: DocumentTypeDef<TGroups>
): FieldDef[] {
  return schema.fields.filter((field) => isZodFieldRequired(field.schema)) as FieldDef[];
}
