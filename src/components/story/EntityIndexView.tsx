// src/components/story/EntityIndexView.tsx
import React, { useState, useEffect } from 'react';
import { Box, Title, Button, Stack, Card, Text, Group } from '@mantine/core';
import { StorySectionShell } from './StorySectionShell';
import { getDocKind } from '../../models/docs';
import type { DocKindId } from '../../models/docs';
import type { CharacterDoc, EntityIndex, EntityIndexEntry } from '../../models/entities';
import { CharacterEditView } from './CharacterEditView';
import { client } from '../../api/client';
import styles from './EntityIndexView.module.scss';
import { EntityGrid } from '../common/EntityGrid';
import { TopNavigation } from '../common/TopNavigation';

type EntityIndexViewProps = {
  projectId: string;
  storyId: string;
  docKind: Extract<DocKindId, 'characters' | 'locations'>;
  currentStoryTitle: string;
};

type ViewMode = 'list' | 'edit';

export const EntityIndexView: React.FC<EntityIndexViewProps> = ({
  projectId,
  storyId,
  docKind,
  currentStoryTitle,
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
        type: 'character',
        name: character.identity!.name,
        aliases: character.identity!.aliases,
        presenceAndExpression: character.presenceAndExpression!,
        innerOrientation: character.innerOrientation,
        sensitivityAndPull: character.sensitivityAndPull,
        externalConstraints: character.externalConstraints,
        tier: character.tier!,
        roleInStory: character.identity!.roleInStory,
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
  const characterViewTitle = `${currentStoryTitle} – ${docConfig.title}`;

  return (
    <StorySectionShell
      projectId={projectId}
      storyId={storyId}
      preloadMetaKeys={[]}
    >
      {mode === 'list' && (
        <Box className={styles.root}>
          <Box py={20} px={30}>
            <TopNavigation
              title={characterViewTitle}
            />
          </Box>
          <Box p="xl">
            <Stack gap="lg">

              {loading && <Text c="dimmed">Loading...</Text>}

              {!loading && (
                <EntityGrid
                  items={characters}
                  getId={(c) => c.id}
                  getLabel={(c) => c.name}
                  onSelect={handleEditCharacter}
                  onCreate={handleAddCharacter}
                  icon="character"
                  createLabel="New Character"
                />
              )}
            </Stack>
          </Box>
        </Box>
      )}

      {mode === 'edit' && docKind === 'characters' && (
        <CharacterEditView
          projectId={projectId}
          storyId={storyId}
          title={`${characterViewTitle} – ${editingCharacter?.name || 'New'}`}
          character={editingCharacter}
          onBack={handleBackToList}
          onSave={handleSaveCharacter}
        />
      )}
    </StorySectionShell>
  );
};

