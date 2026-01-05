// /src/models/entities/schemas/types.ts
import { z } from 'zod';
import type { WizardId } from '../../../wizards/types';

/**
 * Minimal Sanity-like schema DSL.
 * Copy/labels/placeholders live next to validation + UI hints.
 */

export type FieldType = 'text' | 'textarea' | 'select';

export type FieldRole =
  | 'primaryTitle';        // what you show in lists, breadcrumbs, headers

export type FieldOption = { value: string; label: string };

export type GroupDef = {
  id: string;
  label: string;
  description?: string;
};

// Helper: extract the union of group ids from a groups array
export type GroupId<TGroups> =
  TGroups extends readonly (infer G)[]
    ? G extends { id: infer Id }
      ? Id & string
      : never
    : never;

export type FieldDef<TGroup extends string = string> = {
  name: string;
  fieldRole?: FieldRole;

  // UI copy
  label: string;
  description?: string;
  placeholder?: string;
  
  // Internal description, used in LLMs
  documentRoleDescription?: string;

  // UI behavior
  type: FieldType;
  group?: TGroup;

  // Textarea-only UI hints (autosize is assumed default now)
  minRows?: number;

  // Select-only UI hints
  options?: FieldOption[];

  // Data validation (single source of truth)
  schema: z.ZodTypeAny;

  wizard?: WizardId;
  
  // Optional
  includeInProjection?: boolean;
};

export const defineField = <T extends FieldDef<any>>(field: T) => field;

/**
 * Document type definition
 *
 * If `groups` is provided, `field.group` is constrained to those group ids.
 * If `groups` is omitted, `field.group` (if used) is just `string`.
 */
export type DocumentTypeDef<
  TGroups extends readonly GroupDef[] | undefined = undefined
> = {
  name: string;
  title: string;
  version: number;
  groups?: TGroups;
  fields: readonly FieldDef<
    TGroups extends readonly GroupDef[] ? GroupId<TGroups> : string
  >[];
};

export const defineType = <
  const TGroups extends readonly GroupDef[] | undefined,
  const TType extends DocumentTypeDef<TGroups>
>(
  type: TType
) => type;

