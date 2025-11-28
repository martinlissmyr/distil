// electron/fs/writeQueue.ts
/**
 * Write Queue - Prevents race conditions in concurrent file writes
 *
 * Problem: Multiple autosave timers can trigger simultaneously (prose, outline, brief).
 * Both operations read the file, both write back - last write wins, data is lost.
 *
 * Solution: Serialize all writes to the same resource (file/story) so they execute
 * sequentially, while allowing concurrent writes to different resources.
 *
 * Usage:
 *   await writeQueue.enqueue('story:project-123:story-456', async () => {
 *     // Your write operation here
 *   });
 */

class WriteQueue {
  /**
   * Map of resource identifiers to pending write operations
   * Key: unique identifier for the resource (e.g., "story:projectId:storyId")
   * Value: Promise representing the current write chain
   */
  private queue: Map<string, Promise<void>> = new Map();

  /**
   * Enqueues a write operation for a specific resource.
   *
   * If there's already a pending write for this resource, the new operation
   * will wait for it to complete before starting. This ensures all writes
   * to the same resource are serialized.
   *
   * @param key - Unique identifier for the resource being written
   * @param operation - Async function that performs the write
   * @returns Promise that resolves when the operation completes
   *
   * @example
   * ```typescript
   * await writeQueue.enqueue('story:proj1:story1', async () => {
   *   await fs.writeFile(path, data);
   * });
   * ```
   */
  async enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Get any existing operation for this resource
    const existing = this.queue.get(key);

    // Chain the new operation onto the existing one (or start fresh)
    const newPromise = (existing || Promise.resolve())
      .then(() => operation()) // Execute the new operation
      .finally(() => {
        // Clean up: remove from queue if this is still the current operation
        // (another operation might have been enqueued while this was running)
        if (this.queue.get(key) === newPromise) {
          this.queue.delete(key);
        }
      });

    // Store the new operation chain
    this.queue.set(key, newPromise as Promise<void>);

    return newPromise;
  }

  /**
   * Gets the current queue size (number of resources with pending writes)
   * Useful for debugging and testing
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Checks if there are any pending writes for a specific resource
   * Useful for debugging and testing
   */
  hasPending(key: string): boolean {
    return this.queue.has(key);
  }

  /**
   * Waits for all pending writes to complete
   * Useful for testing and graceful shutdown
   */
  async drain(): Promise<void> {
    await Promise.all(this.queue.values());
  }
}

// Export singleton instance
export const writeQueue = new WriteQueue();
