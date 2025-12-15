// src/components/story/EntityIndexView.tsx
import React, { useState, useEffect } from 'react';
import { Box, Title, Button, Stack, Card, Text, Group } from '@mantine/core';
import { StorySectionShell } from './StorySectionShell';
import { Plus } from 'lucide-react';
import { getDocKind } from '../../models/docs';
import type { DocKindId } from '../../models/docs';
import type { CharacterDoc, EntityIndex, EntityIndexEntry } from '../../models/entities';
import { CharacterEditView } from './CharacterEditView';
import { client } from '../../api/client';
import styles from './EntityIndexView.module.scss';
import { EntityCard, CreateEntityCard } from '../common/EntityCard';
import { SquareLibrary } from 'lucide-react';

type EntityIndexViewProps = {
  projectId: string;
  storyId: string;
  docKind: Extract<DocKindId, 'characters' | 'locations'>;
};

type ViewMode = 'list' | 'edit';

export const EntityIndexView: React.FC<EntityIndexViewProps> = ({
  projectId,
  storyId,
  docKind,
}) => {
  const docConfig = getDocKind(docKind);

  // Local navigation state
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingCharacter, setEditingCharacter] = useState<EntityIndexEntry | null>(null);

  // Entity data
  const [entityIndex, setEntityIndex] = useState<EntityIndex | null>(null);
  const [loading, setLoading] = useState(true);

  // Load entity index on mount
  useEffect(() => {
    loadIndex();
  }, [projectId, storyId, docKind]);

  const loadIndex = async () => {
    setLoading(true);
    try {
      const entityType = docKind === 'characters' ? 'character' : 'location';
      const response = await client.loadEntityIndex(projectId, storyId, entityType);

      if (response.ok) {
        setEntityIndex(response.data);
      } else {
        console.error('Failed to load entity index:', response.error);
      }
    } catch (error) {
      console.error('Error loading entity index:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setMode('edit');
  };

  const handleBackToList = () => {
    setMode('list');
    setEditingCharacter(null);
  };

  const handleSaveCharacter = async (character: Partial<CharacterDoc>) => {
    try {
      const entityType = docKind === 'characters' ? 'character' : 'location';

      // Create or update index
      const currentIndex: EntityIndex = entityIndex || {
        version: 1,
        scope: { kind: 'story', projectId, storyId },
        entities: [],
        updatedAt: new Date().toISOString(),
      };

      // Create entity index entry from character doc
      const entry: EntityIndexEntry = {
        id: character.id!,
        name: character.identity!.name,
        tier: character.tier!,
        type: 'character',
        projection: {
          roleInStory: character.identity!.roleInStory,
        },
        docRef: {
          type: 'character',
          id: character.id!,
        },
        updatedAt: new Date().toISOString(),
        createdAt: character.createdAt || new Date().toISOString(),
      };

      // Add or update entry
      const existingIndex = currentIndex.entities.findIndex(e => e.id === entry.id);
      if (existingIndex >= 0) {
        currentIndex.entities[existingIndex] = entry;
      } else {
        currentIndex.entities.push(entry);
      }

      currentIndex.updatedAt = new Date().toISOString();

      // Save to disk
      const response = await client.saveEntityIndex(projectId, storyId, entityType, currentIndex);

      if (response.ok) {
        setEntityIndex(currentIndex);
        handleBackToList();
      } else {
        console.error('Failed to save entity index:', response.error);
      }
    } catch (error) {
      console.error('Error saving character:', error);
      throw error;
    }
  };

  const handleEditCharacter = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    if (character) {
      setEditingCharacter(character);
      setMode('edit');
    }
  };

  const characters = entityIndex?.entities || [];

  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={[]}
    >
      {mode === 'list' && (
        <Box p="xl" className={styles.root}>
          <Stack gap="lg">
            <Title order={1} className={styles.pageTitle}>{docConfig.title}</Title>

            {loading && <Text c="dimmed">Loading...</Text>}

            {!loading && (
              <Group gap="lg">
                {characters.map((char) => {
                  const id = char.id;
                  return (
                    <EntityCard
                      key={id}
                      id={id}
                      label={char.name}
                      onSelect={() => handleEditCharacter(id)}
                      Icon={SquareLibrary}
                    />
                  );
                })}

                <CreateEntityCard
                  onCreate={handleAddCharacter}
                />
              </Group>
            )}
          </Stack>
        </Box>
      )}

      {mode === 'edit' && docKind === 'characters' && (
        <CharacterEditView
          projectId={projectId}
          storyId={storyId}
          character={editingCharacter}
          onBack={handleBackToList}
          onSave={handleSaveCharacter}
        />
      )}
    </StorySectionShell>
  );
};

