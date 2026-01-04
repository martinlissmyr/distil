// src/fixtures/fixtureLoader.ts
import type { EntityIndex } from '../models/entities/entityIndex';
import type { EntityType } from '../models/entities/entityIndex';

// Import fixture JSON files directly
import characterIndexFixture from './projects/project-test-project/stories/story-test-story-characters.json';
import locationIndexFixture from './projects/project-test-project/stories/story-test-story-locations.json';

/**
 * Loads entity index from fixture data.
 * Used as fallback when IPC calls fail for test project/story IDs.
 */
export function loadFixtureEntityIndex(
  projectId: string,
  storyId: string,
  entityType: EntityType
): EntityIndex | null {
  // Only load fixtures for the test project
  if (projectId !== 'project-test-project' || storyId !== 'story-test-story') {
    return null;
  }

  if (entityType === 'character') {
    return characterIndexFixture as EntityIndex;
  } else if (entityType === 'location') {
    return locationIndexFixture as EntityIndex;
  }

  return null;
}
