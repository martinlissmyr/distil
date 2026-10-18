// src/ui/story/StoryPreview.tsx
import { useEffect, useState } from 'react';
import { client } from '../../../api/client';
import { ReadingPreview, type ReadingSection } from './ReadingPreview';

export const StoryPreview = ({
  projectId,
  storyId,
  currentStoryTitle,
  onNavigateToEditor,
}: {
  projectId: string;
  storyId: string;
  currentStoryTitle: string;
  onNavigateToEditor: () => void;
}) => {
  const [sections, setSections] = useState<ReadingSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAllParts() {
      if (!projectId || !storyId) {
        setSections([]);
        return;
      }

      setIsLoading(true);

      try {
        const response = await client.getMergedStory(projectId, storyId);
        if (!response.ok) {
          console.error('[StoryPreview] Failed to load merged story:', response.error);
          return;
        }
        const merged = response.data;

        if (cancelled) return;

        setSections([{
          id: merged.metadata.id,
          parts: merged.parts.map((part) => ({
            id: part.partId,
            title: part.partTitle,
            content: part.content,
          })),
        }]);
      } catch (error) {
        console.error('[PREVIEW] Failed to load parts:', error);
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAllParts();

    return () => {
      cancelled = true;
    };
  }, [projectId, storyId]);

  return (
    <ReadingPreview
      title={`${currentStoryTitle} – Preview`}
      sections={sections}
      isLoading={isLoading}
      emptyMessage="This story has no text yet."
      onBack={onNavigateToEditor}
    />
  );
};
