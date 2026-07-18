// src/models/docs/systemTriggers/index.ts
import type { DocKindId } from '../index';
import type { DocumentTypeDef, GroupDef } from '../../entities/schemas/types';

import proseSystemTriggersMd from './proseTriggers.md?raw';
import charactersSystemTriggersMd from './charactersTriggers.md?raw';
import locationsSystemTriggersMd from './locationsTriggers.md?raw';
import outlineSystemTriggersMd from './outlineTriggers.md?raw';

import { characterType } from '../../entities/schemas/character';
import { locationType } from '../../entities/schemas/location';

import { interpolate } from '../../../helpers/interpolate';
import { extractDocumentRoleDescriptionsMarkdown } from '../../../helpers/entityDocumentRoleHelper';

/* 
  For entity kind docs we want to include all the fields
  that are available to fill in based on the entity schema 
*/
function buildEntityTriggers(
  schema: DocumentTypeDef<readonly GroupDef[] | undefined>,
  md: string,
): string {
  const fieldsMd = extractDocumentRoleDescriptionsMarkdown(schema) || '';
  return interpolate(md, {
    fieldsMd
  });
}

const systemTriggersByDocKind: Partial<Record<DocKindId, string>> = {
  prose: proseSystemTriggersMd,
  outline: outlineSystemTriggersMd,
  characters: buildEntityTriggers(characterType, charactersSystemTriggersMd),
  locations: buildEntityTriggers(locationType, locationsSystemTriggersMd),
};

// ------------------------------
// Public API
// ------------------------------

export function getSystemTriggersForDocKind(kind: DocKindId): string {
  return systemTriggersByDocKind[kind] ?? '';
}
