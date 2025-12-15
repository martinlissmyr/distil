// src/components/story/CharacterEditView.tsx
import React, { useState } from 'react';
import { Box, Title, TextInput, Select, Stack, Group, Button } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import type { CharacterDoc, CharacterTier } from '../../models/entities';
import styles from './EntityIndexView.module.scss';

type CharacterEditViewProps = {
  projectId: string;
  storyId: string;
  characterId: string | null; // null = creating new character
  onBack: () => void;
  onSave: (character: Partial<CharacterDoc>) => Promise<void>;
};

export const CharacterEditView: React.FC<CharacterEditViewProps> = ({
  projectId,
  storyId,
  characterId,
  onBack,
  onSave,
}) => {
  const isNew = characterId === null;

  // Basic form state
  const [name, setName] = useState('');
  const [roleInStory, setRoleInStory] = useState('');
  const [tier, setTier] = useState<CharacterTier>('secondary');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        id: characterId || `character-${Date.now()}`,
        version: 2,
        tier,
        identity: {
          name: name.trim(),
          roleInStory: roleInStory.trim() || undefined,
        },
        updatedAt: new Date().toISOString(),
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
            variant="subtle"
            size="sm"
            leftSection={<ArrowLeft size={16} />}
            onClick={onBack}
          >
            Back to Characters
          </Button>
        </Group>

        <Title order={1} className={styles.pageTitle}>
          {isNew ? 'New Character' : 'Edit Character'}
        </Title>

        {/* Form fields */}
        <Stack gap="md" maw={600}>
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
            <Button variant="subtle" onClick={onBack}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Box>
  );
};
