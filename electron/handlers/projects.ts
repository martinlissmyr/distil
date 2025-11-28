// electron/handlers/projects.ts
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
} from '../fs/alineaFs';
import { validateProjectId, validateName, validateIdArray } from '../validation';
import { safeHandle } from '../utils/ipcHandler';

/**
 * Registers IPC handlers for project CRUD operations
 */
export function registerProjectHandlers(): void {
  safeHandle('projects:list', async () => {
    return listProjects();
  });

  safeHandle('projects:create', async (name: string) => {
    validateName(name);
    return createProject(name);
  });

  safeHandle(
    'projects:update',
    async (projectId: string, updates: { name?: string }) => {
      validateProjectId(projectId);
      if (updates.name !== undefined) {
        validateName(updates.name);
      }
      return updateProject(projectId, updates);
    }
  );

  safeHandle('projects:delete', async (projectId: string) => {
    validateProjectId(projectId);
    await deleteProject(projectId);
    return undefined; // void return
  });

  safeHandle('projects:reorder', async (ids: string[]) => {
    validateIdArray(ids);
    ids.forEach(validateProjectId);
    await reorderProjects(ids);
    return undefined; // void return
  });
}
