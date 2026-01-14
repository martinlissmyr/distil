// src/ui/story/EntityIndexView.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text, Stack } from '@mantine/core';
import { getDocKind } from '../../../models/docs';
import type { DocKindId } from '../../../models/docs';
import type { EntityIndex, EntityIndexEntry } from '../../../models/entities/entityIndex';
import type { CharacterDoc } from '../../../models/entities/schemas/character';
import type { LocationDoc } from '../../../models/entities/schemas/location';
import { EntityEditView } from './EntityEditView';
import { characterType } from '../../../models/entities/schemas/character';
import { locationType } from '../../../models/entities/schemas/location';
import { client } from '../../../api/client';
import styles from './EntityIndexView.module.scss';
import { EntityGrid } from '../../common/EntityGrid';
import { TopNavigation } from '../../common/TopNavigation';
import { buildEntityProjectionMarkdown, loadProjectionTemplate, getPrimaryTitleValue } from '../../../helpers/entityProjectionUtils';

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
  const [editingEntity, setEditingEntity] = useState<EntityIndexEntry | null>(null);
  const [editingEntityDoc, setEditingEntityDoc] = useState<CharacterDoc | LocationDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Entity data
  const [entityIndex, setEntityIndex] = useState<EntityIndex | null>(null);
  const [loading, setLoading] = useState(true);

  // Load entity index on mount
  useEffect(() => {
    loadIndex();
  }, [projectId, storyId, docKind]);

  // Clear editing state when switching between entity types
  useEffect(() => {
    setMode('list');
    setEditingEntity(null);
    setEditingEntityDoc(null);
  }, [docKind]);

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

  const handleAddEntity = () => {
    setEditingEntity(null);
    setEditingEntityDoc(null);
    setMode('edit');
  };

  const handleBackToList = () => {
    setMode('list');
    setEditingEntity(null);
    setEditingEntityDoc(null);
  };

  const handleSaveEntity = async (doc: Partial<CharacterDoc | LocationDoc>) => {
    try {
      const entityType = docKind === 'characters' ? 'character' : 'location';
      const schema = docKind === 'characters' ? characterType : locationType;

      // Save full entity doc to disk
      const saveDocResponse = await client.saveEntityDoc(
        projectId,
        storyId,
        entityType,
        doc.id!,
        doc
      );

      if (!saveDocResponse.ok) {
        console.error('Failed to save entity doc:', saveDocResponse.error);
        throw new Error('Failed to save entity doc');
      }

      // Load projection template
      const template = await loadProjectionTemplate(entityType);

      // Generate projection markdown
      const projectionMarkdown = buildEntityProjectionMarkdown(doc as Record<string, any>, schema, template);

      // Update entity index with projection
      const currentIndex: EntityIndex = entityIndex || {
        version: 1,
        scope: { kind: 'story', projectId, storyId },
        entities: [],
        updatedAt: new Date().toISOString(),
      };

      // Extract name using schema
      const name = getPrimaryTitleValue(doc as Record<string, any>, schema);

      // Create index entry with projection
      const entry: EntityIndexEntry = {
        id: doc.id!,
        name,
        projection: projectionMarkdown,
        docRef: {
          type: entityType,
          id: doc.id!,
        },
      };

      // Add or update entry
      const existingIndex = currentIndex.entities.findIndex(e => e.id === entry.id);
      if (existingIndex >= 0) {
        currentIndex.entities[existingIndex] = entry;
      } else {
        currentIndex.entities.push(entry);
      }

      currentIndex.updatedAt = new Date().toISOString();

      // Save updated index
      const saveIndexResponse = await client.saveEntityIndex(projectId, storyId, entityType, currentIndex);

      if (saveIndexResponse.ok) {
        setEntityIndex(currentIndex);
        handleBackToList();
      } else {
        console.error('Failed to save entity index:', saveIndexResponse.error);
      }
    } catch (error) {
      console.error('Error saving entity:', error);
      throw error;
    }
  };

  const handleEditEntity = async (entityId: string) => {
    const entity = entities.find((e: EntityIndexEntry) => e.id === entityId);
    if (entity) {
      setEditingEntity(entity);
      setLoadingDoc(true);

      try {
        const entityType = docKind === 'characters' ? 'character' : 'location';
        const response = await client.loadEntityDoc(projectId, storyId, entityType, entityId);

        if (response.ok && response.data) {
          setEditingEntityDoc(response.data);
          setMode('edit');
        } else {
          const errorMsg = response.ok ? 'Unknown error' : response.error;
          console.error('Failed to load entity doc:', errorMsg);
        }
      } catch (error) {
        console.error('Error loading entity doc:', error);
      } finally {
        setLoadingDoc(false);
      }
    }
  };

  const handleReorderEntities = async (ids: string[]) => {
    if (!entityIndex) return;

    // Reorder entities array based on new ids order
    const reordered = ids.map(id => entityIndex.entities.find(e => e.id === id)).filter((e): e is EntityIndexEntry => e !== undefined);

    const updatedIndex: EntityIndex = {
      ...entityIndex,
      entities: reordered,
      updatedAt: new Date().toISOString(),
    };

    try {
      const entityType = docKind === 'characters' ? 'character' : 'location';
      const response = await client.saveEntityIndex(projectId, storyId, entityType, updatedIndex);

      if (response.ok) {
        setEntityIndex(updatedIndex);
      } else {
        console.error('Failed to save entity order:', response.ok ? 'Unknown error' : response.error);
      }
    } catch (error) {
      console.error('Error saving entity order:', error);
    }
  };

  const entities = entityIndex?.entities || [];
  const entityViewTitle = `${currentStoryTitle} – ${docConfig.title}`;

  return (
    <>
      {mode === 'list' && (
        <Box className={styles.root}>
          <Box py={20} px={30}>
            <TopNavigation
              title={entityViewTitle}
            />
          </Box>
          <Box p="xl">
            <Stack gap="lg">

              {loading && <Text c="dimmed">Loading...</Text>}

              {!loading && (
                <EntityGrid<EntityIndexEntry>
                  items={entities}
                  getId={(e) => e.id}
                  getLabel={(e) => e.name}
                  onSelect={handleEditEntity}
                  onEdit={() => {}}
                  onCreate={handleAddEntity}
                  onReorderEntities={handleReorderEntities}
                  icon="character"
                  createLabel={`New ${docConfig.title.slice(0, -1)}`}
                />
              )}
            </Stack>
          </Box>
        </Box>
      )}

      {mode === 'edit' && !loadingDoc && (
        <EntityEditView
          projectId={projectId}
          storyId={storyId}
          title={`${entityViewTitle} – ${editingEntity?.name || 'New'}`}
          entityDoc={editingEntityDoc}
          schema={docKind === 'characters' ? characterType : locationType}
          withChat={true}
          doc={{
            scope: 'story',
            docKind,
            projectId,
            storyId,
          }}
          onBack={handleBackToList}
          onSave={handleSaveEntity}
        />
      )}

      {mode === 'edit' && loadingDoc && (
        <Box p="xl">Loading...</Box>
      )}
    </>
  );
};

