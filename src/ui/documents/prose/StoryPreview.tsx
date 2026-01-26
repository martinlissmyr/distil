// src/ui/story/StoryPreview.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@mantine/core';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import { client } from '../../../api/client';
import { getProseExtensions } from '../../editor/primitives/editorConfigFactory';
import { TopNavigation } from '../../common/TopNavigation';
import navigationStyles from './StoryNavigation.module.scss';
import previewStyles from './StoryPreview.module.scss';

type PartDoc = {
  partId: string;
  partIndex: number;
  partTitle: string;
  Element: React.ReactElement;
};

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
  const extensions = useMemo(() => getProseExtensions(), []);
  const [partDocs, setPartDocs] = useState<PartDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAllParts() {
      if (!projectId || !storyId) {
        setPartDocs([]);
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

        const results = merged.parts.map((part) => {
          const Element = renderToReactElement({
            extensions,
            content: part.content,
          }) as React.ReactElement;

          return {
            partId: part.partId,
            partIndex: part.partIndex,
            partTitle: part.partTitle,
            Element,
          } satisfies PartDoc;
        });

        setPartDocs(results);
      } catch (error) {
        console.error('[PREVIEW] Failed to load parts:', error);
        if (!cancelled) setPartDocs([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAllParts();

    return () => {
      cancelled = true;
    };
  }, [projectId, storyId, extensions]);

  return (
    <>
      <Box className={navigationStyles.topNavigation}>
        <TopNavigation
          title={`${currentStoryTitle} – Preview`}
          onBack={onNavigateToEditor}
        />
      </Box>

      <Box className={navigationStyles.topOverlay} />

      <Box className={previewStyles.content}>
        {isLoading ? (
          'Loading…'
        ) : (
          partDocs.map(({ partId, partTitle, Element }) => (
            <Box key={partId} className={previewStyles.part}>
              {partTitle && (
                <h1 className={previewStyles.partTitle}>{partTitle}</h1>
              )}
              {Element}
            </Box>
          ))
        )}
      </Box>
    </>
  );
};