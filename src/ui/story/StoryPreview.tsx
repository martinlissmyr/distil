// src/ui/story/StoryPreview.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@mantine/core';
import { useAppStore } from '../../state/useAppStore';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import { createExtensionsFromConfig } from '../editor/primitives/editorConfigFactory';
import { getDocKind } from '../../models/docs';
import { client } from '../../api/client';
import { TopNavigation } from '../common/TopNavigation';
import navigationStyles from './StoryNavigation.module.scss';
import previewStyles from './StoryPreview.module.scss';

type PartDoc = {
  partId: string;
  partIndex: number;
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
  const currentStoryMetadata = useAppStore((state) => state.currentStoryMetadata);

  const parts = useMemo(() => currentStoryMetadata?.parts || [], [
    currentStoryMetadata?.parts,
  ]);

  // IMPORTANT: avoid cloning/spreading config; keep reference stable
  const docKind = getDocKind('prose');

  const editorConfig = useMemo(() => {
    return (docKind as any).editorConfig;
  }, [docKind]);

  const extensions = useMemo(() => {
    return createExtensionsFromConfig(editorConfig);
  }, [editorConfig]);

  const [partDocs, setPartDocs] = useState<PartDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAllParts() {
      if (!projectId || !storyId || parts.length === 0) {
        setPartDocs([]);
        return;
      }

      setIsLoading(true);

      try {
        const results = await Promise.all(
          parts.map(async (part, index) => {
            const response = await client.loadPartDoc(projectId, storyId, part.id);

            if (!response.ok) {
              console.error('[PREVIEW] load Part Doc failed:', response.error);
              return null;
            }

            const content = response.data.doc.content ?? [];

            const Element = renderToReactElement({
              extensions,
              content: { type: 'doc', content },
            }) as React.ReactElement;

            return { partId: part.id, partIndex: index, Element } satisfies PartDoc;
          })
        );

        if (cancelled) return;

        setPartDocs(results.filter((x): x is PartDoc => x !== null));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadAllParts();

    return () => {
      cancelled = true;
    };
  }, [projectId, storyId, parts, extensions]);

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
          partDocs.map(({ partId, partIndex, Element }) => (
            <Box key={partId} className={previewStyles.part}>
              {partDocs.length > 1 && (
                <h1 className={previewStyles.partTitle}>
                  Kapitel {partIndex + 1}
                </h1>
              )}
              {Element}
            </Box>
          ))
        )}
      </Box>
    </>
  );
};