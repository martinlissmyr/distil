// src/components/story/EntityIndexView.tsx
import React from 'react';
import { Box, Title, Text, Button, Stack } from '@mantine/core';
import { StorySectionShell } from './StorySectionShell';
import { Plus } from 'lucide-react';
import { getDocKind } from '../../models/docs';
import type { DocKindId } from '../../models/docs';

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
      <Box p="xl">
        <Stack gap="lg">
          <Box>
            <Title order={2}>{docConfig.title}</Title>
            <Text c="dimmed" size="sm">{docConfig.shortDescription}</Text>
          </Box>

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

          <Box>
            <Text c="dimmed" size="sm">
              No {docKind} yet. Click the button above to create your first one.
            </Text>
          </Box>
        </Stack>
      </Box>
    </StorySectionShell>
  );
};
