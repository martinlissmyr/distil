import type { DocumentTypeDef, FieldDef, GroupDef } from '../models/entities/schemas/types';
import { getPrimaryTitleValue } from './entityProjectionUtils';

type EntityFieldValue = string | number | boolean | null | undefined;
type EntityFormData = Record<string, EntityFieldValue>;
type EntitySchema = DocumentTypeDef<readonly GroupDef[] | undefined>;

export function entityToMarkdown(
  formData: EntityFormData,
  schema: EntitySchema,
  options?: { includeEmpty?: boolean }
): string {
  const includeEmpty = options?.includeEmpty ?? false;

  // ---- 1. Detect whether there is any meaningful content ----
  const hasAnyContent = schema.fields.some((field) => {
    const value = formData[field.name];

    if (includeEmpty) return true;

    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;

    // for non-string future fields
    return Boolean(value);
  });

  if (!hasAnyContent) {
    return '';
  }

  // ---- 2. Normal rendering (unchanged logic) ----
  const lines: string[] = [];

  const entityName = getPrimaryTitleValue(formData, schema);

  lines.push(`# ${schema.title}: ${entityName}`);
  lines.push('');

  const fieldsByGroup = new Map<string | undefined, FieldDef[]>();
  for (const field of schema.fields) {
    const groupId = field.group;
    if (!fieldsByGroup.has(groupId)) fieldsByGroup.set(groupId, []);
    fieldsByGroup.get(groupId)!.push(field);
  }

  if (schema.groups) {
    for (const group of schema.groups) {
      const fields = fieldsByGroup.get(group.id) || [];
      const groupLines: string[] = [];

      for (const field of fields) {
        const value = formData[field.name];
        if (!includeEmpty && !value) continue;

        if (field.type === 'textarea') {
          groupLines.push(`**${field.label}:**`);
          groupLines.push(String(value || ''));
          groupLines.push('');
        } else {
          groupLines.push(`**${field.label}:** ${value || '_Not set_'}`);
        }
      }

      if (groupLines.length === 0) continue;

      lines.push(`## ${group.label}`);
      if (group.description) {
        lines.push(`_${group.description}_`);
      }
      lines.push('');
      lines.push(...groupLines);
      lines.push('');
    }
  }

  const ungrouped = fieldsByGroup.get(undefined) || [];
  const ungroupedLines: string[] = [];

  for (const field of ungrouped) {
    const value = formData[field.name];
    if (!includeEmpty && !value) continue;

    if (field.type === 'textarea') {
      ungroupedLines.push(`**${field.label}:**`);
      ungroupedLines.push(String(value || ''));
      ungroupedLines.push('');
    } else {
      ungroupedLines.push(`**${field.label}:** ${value || '_Not set_'}`);
    }
  }

  if (ungroupedLines.length > 0) {
    lines.push('## Additional Details');
    lines.push('');
    lines.push(...ungroupedLines);
  }

  return lines.join('\n').trim();
}
