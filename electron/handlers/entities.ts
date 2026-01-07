// electron/handlers/entities.ts
import { loadEntityIndex, saveEntityIndex, loadEntityDoc, saveEntityDoc } from '../fs/fs';
import { validateProjectId, validateStoryId, validateJsonDoc } from '../validation';
import { safeHandle } from '../utils/ipcHandler';

/**
 * Validates entity type
 */
function validateEntityType(entityType: unknown): asserts entityType is 'character' | 'location' {
  if (entityType !== 'character' && entityType !== 'location') {
    throw new Error('Entity type must be either "character" or "location"');
  }
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
    async (projectId: string, storyId: string, entityType: 'character' | 'location', index: any) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateEntityType(entityType);
      validateJsonDoc(index);
      await saveEntityIndex(projectId, storyId, entityType, index);
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
    async (projectId: string, storyId: string, entityType: 'character' | 'location', entityId: string, doc: any) => {
      validateProjectId(projectId);
      validateStoryId(storyId);
      validateEntityType(entityType);
      validateJsonDoc(doc);

      if (!entityId || typeof entityId !== 'string') {
        throw new Error('Invalid entity ID');
      }

      await saveEntityDoc(projectId, storyId, entityType, entityId, doc);
      return undefined; // void return
    }
  );
}
