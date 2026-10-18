import React, { useEffect, useState } from 'react';
import type { StoryMeta } from '../../../api/client';
import { client } from '../../../api/client';
import { ReadingPreview, type ReadingSection } from './ReadingPreview';

type ProjectPreviewProps = {
  projectId: string;
  projectTitle: string;
  stories: StoryMeta[];
  onBack: () => void;
};

export const ProjectPreview: React.FC<ProjectPreviewProps> = ({
  projectId,
  projectTitle,
  stories,
  onBack,
}) => {
  const [sections, setSections] = useState<ReadingSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStories() {
      if (!projectId || stories.length === 0) {
        setSections([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const responses = await Promise.all(
          stories.map(async (story) => ({
            story,
            response: await client.getMergedStory(projectId, story.id),
          }))
        );

        if (cancelled) return;

        const nextSections = responses.flatMap(({ story, response }) => {
          if (!response.ok) {
            console.error(`[ProjectPreview] Failed to load ${story.id}:`, response.error);
            return [];
          }

          return [{
            id: story.id,
            title: response.data.title,
            parts: response.data.parts.map((part) => ({
              id: part.partId,
              title: part.partTitle,
              content: part.content,
            })),
          } satisfies ReadingSection];
        });

        setSections(nextSections);
      } catch (error) {
        console.error('[ProjectPreview] Failed to load stories:', error);
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadStories();

    return () => {
      cancelled = true;
    };
  }, [projectId, stories]);

  return (
    <ReadingPreview
      title={`${projectTitle} – Preview`}
      sections={sections}
      coverTitle={projectTitle}
      isLoading={isLoading}
      emptyMessage="This project has no stories yet."
      onBack={onBack}
    />
  );
};
