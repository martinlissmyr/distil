// /src/helpers/buildZodFromSchema.ts
import { z } from 'zod';
import type { FieldDef, DocumentTypeDef, GroupDef } from '../models/entities/schemas/types';

/**
 * Build a Zod schema for the "data shape" from your field DSL.
 * Note: Current schemas use flat field names. Nested path support
 * (e.g., "identity.name") remains for backwards compatibility but is not used.
 */

interface ZodShape {
  [key: string]: ZodShapeValue;
}

type ZodShapeValue = z.ZodTypeAny | ZodShape;
type GroupedDocumentTypeDef = DocumentTypeDef<readonly GroupDef[] | undefined>;

function isDocumentTypeDef(input: readonly FieldDef[] | GroupedDocumentTypeDef): input is GroupedDocumentTypeDef {
  return !Array.isArray(input);
}

function setDeep(obj: ZodShape, path: string[], value: z.ZodTypeAny): ZodShape {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]!;
    const existing = cur[k];

    // If something already exists at this key and it's not a plain object,
    // we can't safely nest into it.
    if (existing != null && typeof existing !== 'object') {
      throw new Error(
        `[buildZodFromSchema] Cannot nest "${path.join(
          '.'
        )}" because "${path.slice(0, i + 1).join('.')}" is not an object`
      );
    }

    cur[k] ??= {};
    cur = cur[k] as ZodShape;
  }

  cur[path[path.length - 1]!] = value;
  return obj;
}

function isPlainObject(v: unknown): v is ZodShape {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Convert a plain nested shape into Zod objects recursively.
 * Leaves any Zod schemas untouched.
 */
function toZod(value: ZodShapeValue): z.ZodTypeAny {
  // If it already looks like a Zod schema, return it
  if (value && typeof value === 'object' && typeof value.safeParse === 'function') {
    return value as z.ZodTypeAny;
  }

  if (!isPlainObject(value)) {
    // Shouldn't normally happen (setDeep only sets objects or zod schemas)
    return z.unknown();
  }

  const out: Record<string, z.ZodTypeAny> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = toZod(v);
  }
  return z.object(out);
}

/**
 * Backwards-compatible: accept either fields array or a full document type.
 */
export function buildZodFromSchema(input: readonly FieldDef[] | GroupedDocumentTypeDef) {
  const fields: readonly FieldDef[] = isDocumentTypeDef(input) ? input.fields : input;

  const shape: ZodShape = {};
  for (const f of fields) {
    if (!f?.name) continue;
    setDeep(shape, f.name.split('.'), f.schema);
  }

  return toZod(shape);
}
