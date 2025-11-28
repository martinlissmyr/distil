// src/hooks/useEntityCRUD.ts
import { useState, useCallback } from 'react';
import type { IpcResponse } from '../api/alineaClient';

/**
 * Generic CRUD operations interface for any entity type
 */
export interface EntityOperations<T, CreateData, UpdateData> {
  list: () => Promise<IpcResponse<T[]>>;
  create: (data: CreateData) => Promise<IpcResponse<T>>;
  update: (id: string, data: UpdateData) => Promise<IpcResponse<T>>;
  delete: (id: string) => Promise<IpcResponse<undefined>>;
  reorder: (ids: string[]) => Promise<IpcResponse<undefined>>;
}

/**
 * Callbacks for handling side effects after CRUD operations
 */
export interface EntityCallbacks<T> {
  onCreate?: (entity: T) => void | Promise<void>;
  onUpdate?: (entity: T) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

/**
 * Generic hook for managing CRUD operations on any entity type
 *
 * Eliminates duplication between projects and stories CRUD logic by providing:
 * - Centralized state management (items, loading)
 * - Consistent API patterns (create → reload, update → reload, etc.)
 * - Optimistic updates for reordering
 * - Error handling with optional callbacks
 *
 * @example
 * ```typescript
 * const projects = useEntityCRUD({
 *   list: alineaClient.listProjects,
 *   create: alineaClient.createProject,
 *   update: alineaClient.updateProject,
 *   delete: alineaClient.deleteProject,
 *   reorder: alineaClient.reorderProjects,
 * }, {
 *   onCreate: (project) => goToProject(project.id),
 *   onDelete: (id) => { if (selectedId === id) goToProjects() },
 * });
 *
 * // Usage
 * <Button onClick={() => projects.create('New Project')}>Create</Button>
 * ```
 */
export function useEntityCRUD<T extends { id: string }, CreateData, UpdateData>(
  operations: EntityOperations<T, CreateData, UpdateData>,
  callbacks: EntityCallbacks<T> = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const logError = useCallback((message: string, error?: string) => {
    console.error(message, error);
    callbacks.onError?.(error || message);
  }, [callbacks]);

  /**
   * Reload the list of items from the backend
   */
  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await operations.list();
      if (!response.ok) {
        logError('Failed to list items', response.error);
        return;
      }
      setItems(response.data);
    } finally {
      setIsLoading(false);
    }
  }, [operations, logError]);

  /**
   * Create a new item
   * Pattern: API call → reload list → callback → return created item
   */
  const create = useCallback(async (data: CreateData): Promise<T | null> => {
    const createResponse = await operations.create(data);
    if (!createResponse.ok) {
      logError('Failed to create item', createResponse.error);
      return null;
    }
    const created = createResponse.data;

    // Reload list to get updated state
    const listResponse = await operations.list();
    if (!listResponse.ok) {
      logError('Failed to reload list after create', listResponse.error);
      return created;
    }
    setItems(listResponse.data);

    // Callback for side effects (navigation, etc.)
    await callbacks.onCreate?.(created);

    return created;
  }, [operations, callbacks, logError]);

  /**
   * Update an existing item
   * Pattern: API call → reload list → callback → return updated item
   */
  const update = useCallback(async (id: string, data: UpdateData): Promise<T | null> => {
    const updateResponse = await operations.update(id, data);
    if (!updateResponse.ok) {
      logError('Failed to update item', updateResponse.error);
      return null;
    }
    const updated = updateResponse.data;

    // Reload list to get updated state
    const listResponse = await operations.list();
    if (!listResponse.ok) {
      logError('Failed to reload list after update', listResponse.error);
      return updated;
    }
    setItems(listResponse.data);

    // Callback for side effects
    await callbacks.onUpdate?.(updated);

    return updated;
  }, [operations, callbacks, logError]);

  /**
   * Delete an item
   * Pattern: API call → reload list → callback → return success
   */
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    const deleteResponse = await operations.delete(id);
    if (!deleteResponse.ok) {
      logError('Failed to delete item', deleteResponse.error);
      return false;
    }

    // Reload list to get updated state
    const listResponse = await operations.list();
    if (!listResponse.ok) {
      logError('Failed to reload list after delete', listResponse.error);
      return true; // Delete succeeded even if reload failed
    }
    setItems(listResponse.data);

    // Callback for side effects (navigation away, etc.)
    await callbacks.onDelete?.(id);

    return true;
  }, [operations, callbacks, logError]);

  /**
   * Reorder items
   * Pattern: Optimistic update → API call (no reload needed)
   */
  const reorder = useCallback(async (ids: string[]): Promise<boolean> => {
    // Optimistic update
    const byId = new Map(items.map((item) => [item.id, item]));
    const reordered = ids.map((id) => byId.get(id)!).filter(Boolean);
    setItems(reordered);

    // API call (don't reload, already have the correct order)
    const response = await operations.reorder(ids);
    if (!response.ok) {
      logError('Failed to reorder items', response.error);
      // TODO: Could rollback optimistic update here
      return false;
    }

    return true;
  }, [items, operations, logError]);

  /**
   * Manually set the items list (useful for initialization)
   */
  const setItemsManually = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  return {
    items,
    isLoading,
    create,
    update,
    delete: deleteItem,
    reorder,
    reload,
    setItems: setItemsManually,
  };
}
