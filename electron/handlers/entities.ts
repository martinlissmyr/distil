// electron/handlers/entities.ts
import { loadEntityIndex, saveEntityIndex, loadEntityDoc, saveEntityDoc } from '../fs/fs';
import { validateProjectId, validateStoryId, validateJsonDoc } from '../validation';
import { safeHandle } from '../utils/ipcHandler';
import type { EntityIndex } from '../../src/models/entities/entityIndex';
import { CharacterDocSchema } from '../../src/models/entities/schemas/character';
import { LocationDocSchema } from '../../src/models/entities/schemas/location';

type EntityDoc = ReturnType<typeof CharacterDocSchema.parse> | ReturnType<typeof LocationDocSchema.parse>;

/**
 * Validates entity type
 */
function validateEntityType(entityType: unknown): asserts entityType is 'character' | 'location' {
  if (entityType !== 'character' && entityType !== 'location') {
    throw new Error('Entity type must be either "character" or "location"');
  }
}

function validateEntityIndex(index: unknown): EntityIndex {
  validateJsonDoc(index);

  const candidate = index as Partial<EntityIndex>;
  if (
    candidate.version !== 1 ||
    !candidate.scope ||
    candidate.scope.kind !== 'story' ||
    typeof candidate.scope.projectId !== 'string' ||
    typeof candidate.scope.storyId !== 'string' ||
    !Array.isArray(candidate.entities) ||
    typeof candidate.updatedAt !== 'string'
  ) {
    throw new Error('Invalid entity index');
  }

  return candidate as EntityIndex;
}

function validateEntityDoc(entityType: 'character' | 'location', doc: unknown): EntityDoc {
  validateJsonDoc(doc);
  return entityType === 'character'
    ? CharacterDocSchema.parse(doc)
    : LocationDocSchema.parse(doc);
}

/**
 * Registers IPC handlers for entity operations (characters, locations)
 */
export function registerEntityHandlers(): void {
  safeHandle(
    'entity:loadIndex',
    async (projectId: string, storyId: string, entityType: 'character' | 'location') => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateEntityType(entityType);
      return loadEntityIndex(projectId, storyId, entityType);
    }
  );

  safeHandle(
    'entity:saveIndex',
    async (projectId: string, storyId: string, entityType: 'character' | 'location', index: unknown) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateEntityType(entityType);
      await saveEntityIndex(projectId, storyId, entityType, validateEntityIndex(index));
      return undefined; // void return
    }
  );

  safeHandle(
    'entity:load',
    async (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateEntityType(entityType);

      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Invalid entity ID');
      }

      return loadEntityDoc(projectId, storyId, entityType, entityId);
    }
  );

  safeHandle(
    'entity:save',
    async (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string, doc: unknown) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateEntityType(entityType);

      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Invalid entity ID');
      }

      await saveEntityDoc(projectId, storyId, entityType, entityId, validateEntityDoc(entityType, doc));
      return undefined; // void return
    }
  );
}
