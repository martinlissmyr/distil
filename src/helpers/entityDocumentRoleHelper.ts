// src/helpers/entityDocumentRoleHelper.ts
import type { DocumentTypeDef, FieldDef } from '../models/entities/schemas/types';

/**
 * Extracts assistant-facing "documentRoleDescription" lines from a schema type.
 * Keeps schema order. Skips empty/undefined values.
 */
export function extractDocumentRoleDescriptions(
  schema: DocumentTypeDef<any>
): string[] {
  return (schema.fields as readonly FieldDef[]).flatMap((f) => {
    const d = (f as any).documentRoleDescription;
    if (typeof d !== 'string') return [];
    const trimmed = d.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  });
}

/**
 * Convenience helper: returns a markdown bullet list:
 * - Foo
 * - Bar
 */
export function extractDocumentRoleDescriptionsMarkdown(
  schema: DocumentTypeDef<any>,
  options: { bullet?: '-' | '*' } = {}
): string {
  const bullet = options.bullet ?? '-';
  const lines = extractDocumentRoleDescriptions(schema);
  return lines.map((l) => `${bullet} ${l}`).join('\n');
}