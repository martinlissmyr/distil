import { syncRegistryWithDistilFolder } from '../handlers/bundles'

/**
 * Wraps a save operation with error recovery
 * If save fails due to missing file (ENOENT), syncs registry and retries once
 */
export async function saveWithRecovery<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation()
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException
    // If file/directory not found, bundle might have been renamed
    if (error?.code === 'ENOENT') {
      console.warn(`[saveWithRecovery] ${operationName} failed (ENOENT), syncing registry and retrying...`)

      try {
        // Sync registry to detect bundle renames
        await syncRegistryWithDistilFolder()

        // Retry the operation once with updated paths
        return await operation()
      } catch (retryErr) {
        console.error(`[saveWithRecovery] ${operationName} retry failed:`, retryErr)
        throw new Error(`Failed to save after registry sync: ${retryErr instanceof Error ? retryErr.message : 'Unknown error'}`)
      }
    }

    // Other errors - rethrow
    throw error
  }
}
