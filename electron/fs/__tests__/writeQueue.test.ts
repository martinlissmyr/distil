// electron/fs/__tests__/writeQueue.test.ts
/**
 * Write Queue Tests
 *
 * These tests verify that the write queue correctly serializes
 * concurrent operations to prevent race conditions.
 */

import { writeQueue } from '../writeQueue';

describe('WriteQueue', () => {
  beforeEach(() => {
    // Clear any pending operations before each test
    return writeQueue.drain();
  });

  it('should serialize operations to the same resource', async () => {
    const executionOrder: number[] = [];
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Enqueue 3 operations for the same resource
    const promises = [
      writeQueue.enqueue('resource-1', async () => {
        executionOrder.push(1);
        await delay(10);
        executionOrder.push(4);
      }),
      writeQueue.enqueue('resource-1', async () => {
        executionOrder.push(2);
        await delay(10);
        executionOrder.push(5);
      }),
      writeQueue.enqueue('resource-1', async () => {
        executionOrder.push(3);
        await delay(10);
        executionOrder.push(6);
      }),
    ];

    await Promise.all(promises);

    // Operations should execute serially: 1 completes, then 2, then 3
    expect(executionOrder).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it('should allow concurrent operations to different resources', async () => {
    const executionTimes: Record<string, { start: number; end: number }> = {};
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const startTime = Date.now();

    // Enqueue operations for different resources
    const promises = [
      writeQueue.enqueue('resource-A', async () => {
        executionTimes['A'] = { start: Date.now() - startTime, end: 0 };
        await delay(50);
        executionTimes['A'].end = Date.now() - startTime;
      }),
      writeQueue.enqueue('resource-B', async () => {
        executionTimes['B'] = { start: Date.now() - startTime, end: 0 };
        await delay(50);
        executionTimes['B'].end = Date.now() - startTime;
      }),
    ];

    await Promise.all(promises);

    // Operations to different resources should overlap (run concurrently)
    // Both should start around the same time (within 10ms)
    expect(Math.abs(executionTimes['A'].start - executionTimes['B'].start)).toBeLessThan(10);
  });

  it('should prevent race conditions in read-modify-write scenario', async () => {
    // Simulate the story save race condition
    let fileContent = { counter: 0 };

    const increment = async () => {
      // Read
      const current = { ...fileContent };
      // Simulate async delay
      await new Promise(resolve => setTimeout(resolve, 5));
      // Modify
      current.counter++;
      // Write
      fileContent = current;
    };

    // WITHOUT queue, concurrent increments would cause lost updates
    // WITH queue, all increments are serialized

    const promises = Array.from({ length: 10 }, (_, i) =>
      writeQueue.enqueue('file:counter', increment)
    );

    await Promise.all(promises);

    // All 10 increments should be reflected
    expect(fileContent.counter).toBe(10);
  });

  it('should clean up queue after operations complete', async () => {
    expect(writeQueue.size()).toBe(0);

    const promise = writeQueue.enqueue('resource-1', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Queue should have the operation while it's running
    expect(writeQueue.hasPending('resource-1')).toBe(true);

    await promise;

    // Queue should be cleaned up after completion
    expect(writeQueue.hasPending('resource-1')).toBe(false);
    expect(writeQueue.size()).toBe(0);
  });

  it('should handle errors without breaking the queue', async () => {
    let successfulOperations = 0;

    const promises = [
      writeQueue.enqueue('resource-1', async () => {
        throw new Error('Intentional failure');
      }).catch(() => {
        // Swallow error for test
      }),
      writeQueue.enqueue('resource-1', async () => {
        successfulOperations++;
      }),
      writeQueue.enqueue('resource-1', async () => {
        successfulOperations++;
      }),
    ];

    await Promise.all(promises);

    // Subsequent operations should still execute despite earlier error
    expect(successfulOperations).toBe(2);
    expect(writeQueue.size()).toBe(0);
  });

  it('should return the result from the operation', async () => {
    const result = await writeQueue.enqueue('resource-1', async () => {
      return { success: true, data: 'test' };
    });

    expect(result).toEqual({ success: true, data: 'test' });
  });

  it('should demonstrate the race condition scenario from the app', async () => {
    // Simulate the actual race condition: saveStory and saveStoryMetaDoc
    // both reading and writing to the same file

    let storyFile = {
      id: 'story-1',
      title: 'Test Story',
      doc: { type: 'doc', content: [] },
      metaDocs: {},
    };

    const saveStorySimulation = async () => {
      // Read file
      const existing = { ...storyFile };
      await new Promise(resolve => setTimeout(resolve, 5));
      // Modify prose
      existing.doc = { type: 'doc', content: [{ text: 'prose content' }] };
      await new Promise(resolve => setTimeout(resolve, 5));
      // Write file
      storyFile = existing;
    };

    const saveMetaDocSimulation = async () => {
      // Read file
      const existing = { ...storyFile };
      await new Promise(resolve => setTimeout(resolve, 5));
      // Modify metaDocs
      existing.metaDocs = { outline: { type: 'doc', content: [] } };
      await new Promise(resolve => setTimeout(resolve, 5));
      // Write file
      storyFile = existing;
    };

    // Both operations queued with same key
    await Promise.all([
      writeQueue.enqueue('story:proj1:story1', saveStorySimulation),
      writeQueue.enqueue('story:proj1:story1', saveMetaDocSimulation),
    ]);

    // Both changes should be present (no data loss)
    expect(storyFile.doc).toEqual({ type: 'doc', content: [{ text: 'prose content' }] });
    expect(storyFile.metaDocs).toEqual({ outline: { type: 'doc', content: [] } });
  });
});
