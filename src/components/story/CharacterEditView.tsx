// src/components/story/CharacterEditView.tsx
import React, { useState, useEffect } from 'react';
import { Box, Title, TextInput, Select, Stack, Group, Button } from '@mantine/core';
import { Icon } from '../common/Icon';
import type { CharacterDoc, CharacterTier, EntityIndexEntry } from '../../models/entities';
import styles from './EntityIndexView.module.scss';

type CharacterEditViewProps = {
  projectId: string;
  storyId: string;
  character: EntityIndexEntry | null; // null = creating new character
  onBack: () => void;
  onSave: (character: Partial<CharacterDoc>) => Promise<void>;
};

export const CharacterEditView: React.FC<CharacterEditViewProps> = ({
  projectId,
  storyId,
  character,
  onBack,
  onSave,
}) => {
  const isNew = character === null;

  // Basic form state
  const [name, setName] = useState('');
  const [roleInStory, setRoleInStory] = useState('');
  const [tier, setTier] = useState<CharacterTier>('secondary');
  const [saving, setSaving] = useState(false);

  // Load character data when editing
  useEffect(() => {
    if (character) {
      setName(character.name);
      setTier(character.tier);
      if (character.type === 'character' && character.projection.roleInStory) {
        setRoleInStory(character.projection.roleInStory);
      }
    } else {
      // Reset form for new character
      setName('');
      setRoleInStory('');
      setTier('secondary');
    }
  }, [character]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        id: character?.id || `character-${Date.now()}`,
        version: 2,
        tier,
        identity: {
          name: name.trim(),
          roleInStory: roleInStory.trim() || undefined,
        },
        updatedAt: new Date().toISOString(),
        createdAt: character?.createdAt,
      });
      onBack();
    } catch (error) {
      console.error('Failed to save character:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p="xl" className={styles.root}>
      <Stack gap="lg">
        {/* Header with back button */}
        <Group>
          <Button
            variant="light"
            radius="xl"
            size="sm"
            leftSection={<Icon type="back" size={20} />}
            onClick={onBack}
          >
            Back
          </Button>
        </Group>

        <Box w={600} ml="auto" mr="auto">

          {/* Form fields */}
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Character name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              size="md"
            />

            <TextInput
              label="Role in Story"
              placeholder="e.g., protagonist, antagonist, mentor"
              value={roleInStory}
              onChange={(e) => setRoleInStory(e.currentTarget.value)}
              size="md"
            />

            <Select
              label="Importance"
              value={tier}
              onChange={(value) => setTier(value as CharacterTier)}
              data={[
                { value: 'primary', label: 'Primary' },
                { value: 'significant', label: 'Significant' },
                { value: 'secondary', label: 'Secondary' },
              ]}
              size="md"
            />

            {/* Save button */}
            <Group mt="md">
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                loading={saving}
              >
                {isNew ? 'Create Character' : 'Save Changes'}
              </Button>
            </Group>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
