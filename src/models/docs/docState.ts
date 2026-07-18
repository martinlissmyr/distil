// src/models/docs/docState.ts
import type { MetaDocKey } from '../../types/metaDoc';
import type { MetaDocState } from '../../types/metaDoc';
import type { IpcResponse } from '../../api/client';
import type { EntityIndex, EntityType } from '../entities/entityIndex';
import { getDocKind, isEntityIndexDoc } from './index';
import { metaId } from '../../state/useAppStore';
import type { DocState } from '../../chat/chatHints';

/**
 * Computes the state of a meta document (missing, empty, or hasContent).
 * Handles both rich text docs (stored in metaDocs) and entity index docs
 * (stored as separate files).
 */
export async function computeDocState(
  docKey: MetaDocKey,
  scope:
    | { scope: 'root' }
    | { scope: 'story'; projectId: string; storyId: string },
  options: {
    metaDocs?: Record<string, MetaDocState>;
    loadEntityIndex?: (
      projectId: string,
      storyId: string,
      entityType: EntityType
    ) => Promise<IpcResponse<EntityIndex | null>>;
  } = {}
): Promise<DocState> {
  const docKind = getDocKind(docKey);

  // Handle entity index docs differently
  if (isEntityIndexDoc(docKind)) {
    if (scope.scope !== 'story') {
      return 'missing'; // Entity indices only exist at story scope
    }

    if (!options.loadEntityIndex) {
      console.warn('loadEntityIndex not provided, cannot check entity index state');
      return 'missing';
    }

    try {
      const response = await options.loadEntityIndex(
        scope.projectId,
        scope.storyId,
        docKind.entityType
      );

      if (!response.ok || !response.data) {
        return 'missing';
      }

      const index = response.data;
      const hasEntities = index.entities && index.entities.length > 0;

      return hasEntities ? 'hasContent' : 'empty';
    } catch (error) {
      console.error(`Failed to load ${docKind.entityType} index:`, error);
      return 'missing';
    }
  }

  // Handle rich text docs (stored in metaDocs)
  const metaDocs = options.metaDocs || {};
  const id =
    scope.scope === 'root'
      ? metaId({ scope: 'root' }, docKey)
      : metaId({ scope: 'story', projectId: scope.projectId, storyId: scope.storyId }, docKey);

  const doc = metaDocs[id];

  if (!doc || doc.json === null) return 'missing';

  const markdown = doc.markdown ?? '';
  if (!markdown.trim()) return 'empty';

  return 'hasContent';
}

/**
 * Synchronous version for rich text docs only (doesn't handle entity indices).
 * Use this when you know the doc is a rich text doc or when entity indices
 * aren't relevant.
 */
export function computeRichTextDocState(
  docKey: MetaDocKey,
  scope:
    | { scope: 'root' }
    | { scope: 'story'; projectId: string; storyId: string },
  metaDocs: Record<string, MetaDocState>
): DocState {
  const id =
    scope.scope === 'root'
      ? metaId({ scope: 'root' }, docKey)
      : metaId({ scope: 'story', projectId: scope.projectId, storyId: scope.storyId }, docKey);

  const doc = metaDocs[id];

  if (!doc || doc.json === null) return 'missing';

  const markdown = doc.markdown ?? '';
  if (!markdown.trim()) return 'empty';

  return 'hasContent';
}
