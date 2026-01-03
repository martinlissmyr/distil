// /src/helpers/buildZodFromSchema.ts
import { z } from 'zod';
import type { FieldDef, DocumentTypeDef } from '../models/entities/schemas/types';

/**
 * Build a Zod schema for the "data shape" from your field DSL.
 * Supports nested paths like "identity.name" by expanding to objects.
 */

function setDeep(obj: any, path: string[], value: any) {
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
    cur = cur[k];
  }

  cur[path[path.length - 1]!] = value;
  return obj;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Convert a plain nested shape into Zod objects recursively.
 * Leaves any Zod schemas untouched.
 */
function toZod(value: any): any {
  // If it already looks like a Zod schema, return it
  if (value && typeof value === 'object' && typeof value.safeParse === 'function') {
    return value;
  }

  if (!isPlainObject(value)) {
    // Shouldn't normally happen (setDeep only sets objects or zod schemas)
    return z.any();
  }

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = toZod(v);
  }
  return z.object(out);
}

/**
 * Backwards-compatible: accept either fields array or a full document type.
 */
export function buildZodFromSchema(input: readonly FieldDef[] | DocumentTypeDef<any>) {
  const fields: readonly FieldDef[] = Array.isArray(input) ? input : input.fields;

  const shape: any = {};
  for (const f of fields) {
    if (!f?.name) continue;
    setDeep(shape, f.name.split('.'), f.schema);
  }

  return toZod(shape);
}