import React, { useMemo } from 'react';
import type { JSONContent } from '@tiptap/react';
import { Box } from '@mantine/core';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import { getProseExtensions } from '../../editor/primitives/editorConfigFactory';
import { TopNavigation } from '../../common/TopNavigation';
import navigationStyles from './StoryNavigation.module.scss';
import previewStyles from './StoryPreview.module.scss';

export type ReadingPart = {
  id: string;
  title: string;
  content: JSONContent;
};

export type ReadingSection = {
  id: string;
  title?: string;
  parts: ReadingPart[];
};

type RenderedSection = Omit<ReadingSection, 'parts'> & {
  parts: Array<ReadingPart & { Element: React.ReactElement }>;
};

type ReadingPreviewProps = {
  title: string;
  sections: ReadingSection[];
  coverTitle?: string;
  isLoading: boolean;
  emptyMessage: string;
  onBack: () => void;
};

/**
 * Shared, read-only prose renderer for story and project reading modes.
 * Keeping the static TipTap renderer and book typography here ensures both
 * modes handle the same document structures and paragraph rules.
 */
export const ReadingPreview: React.FC<ReadingPreviewProps> = ({
  title,
  sections,
  coverTitle,
  isLoading,
  emptyMessage,
  onBack,
}) => {
  const extensions = useMemo(() => getProseExtensions(), []);
  const renderedSections = useMemo<RenderedSection[]>(
    () => sections.map((section) => ({
      ...section,
      parts: section.parts.map((part) => ({
        ...part,
        Element: renderToReactElement({
          extensions,
          content: part.content,
        }) as React.ReactElement,
      })),
    })),
    [extensions, sections]
  );

  return (
    <>
      <Box className={navigationStyles.topNavigation}>
        <TopNavigation title={title} onBack={onBack} />
      </Box>

      <Box className={navigationStyles.topOverlay} />

      <Box className={previewStyles.content}>
        {isLoading ? (
          'Loading…'
        ) : (
          <>
            {coverTitle && (
              <header className={previewStyles.cover}>
                <h1 className={previewStyles.coverTitle}>{coverTitle}</h1>
              </header>
            )}

            {renderedSections.length === 0 ? (
              emptyMessage
            ) : renderedSections.map(({ id, title: sectionTitle, parts }) => {
              const renderedParts = parts.map(({ id: partId, title: partTitle, Element }) => (
                <Box key={partId} className={previewStyles.part}>
                  {partTitle && (
                    <h1 className={previewStyles.partTitle}>{partTitle}</h1>
                  )}
                  {Element}
                </Box>
              ));

              // A story preview historically rendered its parts directly inside
              // .content. Preserve that markup so its typography remains exact.
              if (!sectionTitle) {
                return <React.Fragment key={id}>{renderedParts}</React.Fragment>;
              }

              return (
                <section key={id} className={previewStyles.story}>
                  <h1 className={previewStyles.storyTitle}>{sectionTitle}</h1>
                  {renderedParts}
                </section>
              );
            })}
          </>
        )}
      </Box>
    </>
  );
};
