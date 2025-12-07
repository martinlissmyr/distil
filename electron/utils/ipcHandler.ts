// electron/utils/ipcHandler.ts
/**
 * Standardized IPC Handler Utilities
 *
 * Provides consistent error handling and response formatting across all IPC handlers.
 * All handlers return a standardized response shape: { ok: true, data: T } or { ok: false, error: string }
 */

import { ipcMain } from 'electron';

/**
 * Standard success response
 */
export type SuccessResponse<T> = {
  ok: true;
  data: T;
};

/**
 * Standard error response
 */
export type ErrorResponse = {
  ok: false;
  error: string;
};

/**
 * Standard IPC response - either success with data or error with message
 */
export type IpcResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Wraps an IPC handler with standardized error handling.
 *
 * Benefits:
 * - Consistent response format across all handlers
 * - Automatic error logging with channel name
 * - Type-safe responses
 * - Prevents unhandled rejections
 *
 * @param channel - IPC channel name (e.g., 'projects:create')
 * @param handler - Async function that performs the operation
 *
 * @example
 * ```typescript
 * safeHandle('projects:create', async (name: string) => {
 *   validateName(name);
 *   return createProject(name);
 * });
 * ```
 */
export function safeHandle<TArgs extends any[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult>
): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    try {
      const result = await handler(...args);
      return {
        ok: true,
        data: result,
      } as SuccessResponse<TResult>;
    } catch (error) {
      // Log the error with channel context for debugging
      console.error(`[IPC ${channel}] Error:`, error);

      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ErrorResponse;
    }
  });
}

/**
 * Type guard to check if a response is successful
 *
 * @example
 * ```typescript
 * const response = await window.alinea.createProject('My Project');
 * if (isSuccess(response)) {
 *   console.log('Created:', response.data);
 * } else {
 *   console.error('Error:', response.error);
 * }
 * ```
 */
export function isSuccess<T>(
  response: IpcResponse<T>
): response is SuccessResponse<T> {
  return response.ok === true;
}

/**
 * Type guard to check if a response is an error
 */
export function isError<T>(
  response: IpcResponse<T>
): response is ErrorResponse {
  return response.ok === false;
}

/**
 * Unwraps a successful response or throws the error
 *
 * @example
 * ```typescript
 * const project = unwrap(await window.alinea.createProject('My Project'));
 * // If response was an error, this line won't be reached
 * console.log('Created:', project);
 * ```
 */
export function unwrap<T>(response: IpcResponse<T>): T {
  if (isSuccess(response)) {
    return response.data;
  }
  throw new Error(response.error);
}