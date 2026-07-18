// src/ui/story/EntityIndexView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Stack } from '@mantine/core';
import { getDocKind } from '../../../models/docs';
import type { DocKindId } from '../../../models/docs';
import type { EntityIndex, EntityIndexEntry } from '../../../models/entities/entityIndex';
import type { CharacterDoc } from '../../../models/entities/schemas/character';
import type { LocationDoc } from '../../../models/entities/schemas/location';
import type { DocumentTypeDef, GroupDef } from '../../../models/entities/schemas/types';
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
type EntityDoc = CharacterDoc | LocationDoc;
type EntitySchema = DocumentTypeDef<readonly GroupDef[] | undefined>;

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

  const entityType = docKind === 'characters' ? 'character' : 'location';
  const schema: EntitySchema = docKind === 'characters' ? characterType : locationType;
  const entities = entityIndex?.entities || [];
  const entityViewTitle = `${currentStoryTitle} – ${docConfig.title}`;

  const createEmptyIndex = useCallback((): EntityIndex => ({
    version: 1,
    scope: { kind: 'story', projectId, storyId },
    entities: [],
    updatedAt: new Date().toISOString(),
  }), [projectId, storyId]);

  // Load entity index on mount
  useEffect(() => {
    let cancelled = false;

    void client.loadEntityIndex(projectId, storyId, entityType)
      .then((response) => {
        if (cancelled) return;

        if (response.ok) {
          setEntityIndex(response.data);
        } else {
          console.error('Failed to load entity index:', response.error);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error loading entity index:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityType, projectId, storyId]);

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

  const handleSaveEntity = async (doc: Partial<EntityDoc>) => {
    try {
      if (!doc.id) {
        throw new Error('Entity document must have an id before saving');
      }

      // Save full entity doc to disk
      const saveDocResponse = await client.saveEntityDoc(
        projectId,
        storyId,
        entityType,
        doc.id,
        doc as EntityDoc
      );

      if (!saveDocResponse.ok) {
        console.error('Failed to save entity doc:', saveDocResponse.error);
        throw new Error('Failed to save entity doc');
      }

      // Load projection template
      const template = await loadProjectionTemplate(entityType);

      // Generate projection markdown
      const projectionMarkdown = buildEntityProjectionMarkdown(doc, schema, template);

      // Update entity index with projection
      const currentIndex = entityIndex ?? createEmptyIndex();

      // Extract name using schema
      const name = getPrimaryTitleValue(doc, schema);

      // Create index entry with projection
      const entry: EntityIndexEntry = {
        id: doc.id,
        name,
        projection: projectionMarkdown,
        docRef: {
          type: entityType,
          id: doc.id,
        },
      };

      // Add or update entry
      const existingIndex = currentIndex.entities.findIndex(e => e.id === entry.id);
      const nextEntities =
        existingIndex >= 0
          ? currentIndex.entities.map((currentEntry, index) =>
              index === existingIndex ? entry : currentEntry
            )
          : [...currentIndex.entities, entry];
      const nextIndex: EntityIndex = {
        ...currentIndex,
        entities: nextEntities,
        updatedAt: new Date().toISOString(),
      };

      // Save updated index
      const saveIndexResponse = await client.saveEntityIndex(projectId, storyId, entityType, nextIndex);

      if (saveIndexResponse.ok) {
        setEntityIndex(nextIndex);
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
          key={`${docKind}:${editingEntity?.id ?? 'new'}`}
          projectId={projectId}
          storyId={storyId}
          title={`${entityViewTitle} – ${editingEntity?.name || 'New'}`}
          entityDoc={editingEntityDoc}
          schema={schema}
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

