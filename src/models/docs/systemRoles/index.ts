// src/models/docs/systemRoles.ts
import type { DocKindId } from '../index';

import proseSystemRoleMd from './proseRole.md?raw';
import manifestSystemRoleMd from './manifestRole.md?raw';
import outlineSystemRoleMd from './outlineRole.md?raw';
import briefSystemRoleMd from './briefRole.md?raw';
import worldSystemRoleMd from './worldRole.md?raw';
import styleSystemRoleMd from './styleRole.md?raw';
import defaultSystemRoleMd from './defaultRole.md?raw';

const systemRoleByDocKind: Partial<Record<DocKindId, string>> = {
  prose: proseSystemRoleMd,
  brief: briefSystemRoleMd,
  world: worldSystemRoleMd,
  style: styleSystemRoleMd,
  manifest: manifestSystemRoleMd,
  outline: outlineSystemRoleMd,
};

export function getSystemRoleForDocKind(kind: DocKindId): string {
  return systemRoleByDocKind[kind] ?? defaultSystemRoleMd;
}
