// src/components/story/EntityIndexView.tsx
import React from 'react';
import { Box, Title, Text, Button, Stack } from '@mantine/core';
import { StorySectionShell } from './StorySectionShell';
import { Plus } from 'lucide-react';
import { getDocKind } from '../../models/docs';
import type { DocKindId } from '../../models/docs';
import styles from './EntityIndexView.module.scss';

type EntityIndexViewProps = {
  projectId: string;
  storyId: string;
  docKind: Extract<DocKindId, 'characters' | 'locations'>;
};

export const EntityIndexView: React.FC<EntityIndexViewProps> = ({
  projectId,
  storyId,
  docKind,
}) => {
  const docConfig = getDocKind(docKind);

  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={[]}
    >
      <Box p="xl" className={styles.root}>
        <Stack gap="lg">
          <Title order={1} className={styles.pageTitle}>{docConfig.title}</Title>

          <Button
            leftSection={<Plus size={16} />}
            variant="light"
            onClick={() => {
              // TODO: Implement entity creation
              console.log('Create new', docKind);
            }}
          >
            Add {docKind === 'characters' ? 'Character' : 'Location'}
          </Button>

        </Stack>
      </Box>
    </StorySectionShell>
  );
};
