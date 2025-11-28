// electron/handlers/projects.ts
import { ipcMain } from 'electron';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
} from '../fs/alineaFs';
import { validateProjectId, validateName, validateIdArray } from '../validation';

/**
 * Registers IPC handlers for project CRUD operations
 */
export function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', async () => listProjects());

  ipcMain.handle('projects:create', async (_event, name: string) => {
    validateName(name);
    return createProject(name);
  });

  ipcMain.handle(
    'projects:update',
    async (_event, projectId: string, updates: { name?: string }) => {
      validateProjectId(projectId);
      if (updates.name !== undefined) {
        validateName(updates.name);
      }
      return updateProject(projectId, updates);
    }
  );

  ipcMain.handle('projects:delete', async (_event, projectId: string) => {
    validateProjectId(projectId);
    await deleteProject(projectId);
    return { ok: true };
  });

  ipcMain.handle('projects:reorder', async (_event, ids: string[]) => {
    validateIdArray(ids);
    ids.forEach(validateProjectId);
    await reorderProjects(ids);
    return { ok: true };
  });
}
