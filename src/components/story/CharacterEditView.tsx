// src/components/story/CharacterEditView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Stack, Group, Button, Divider, ScrollArea } from '@mantine/core';
import { Icon } from '../common/Icon';
import type { CharacterDoc, CharacterTier, EntityIndexEntry } from '../../models/entities';
import { TopNavigation } from '../common/TopNavigation';
import { Textarea } from '../common/inputs/Textarea';
import { TextInput } from '../common/inputs/TextInput';
import { Select } from '../common/inputs/Select';
import styles from './EntityIndexView.module.scss';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';

type CharacterEditViewProps = {
  projectId: string;
  storyId: string;
  character: EntityIndexEntry | null; // null = creating new character
  onBack: () => void;
  onSave: (character: Partial<CharacterDoc>) => Promise<void>;
  title: string;
};

const isCharacterTier = (v: unknown): v is CharacterTier =>
  v === 'primary' || v === 'significant' || v === 'secondary';

export const CharacterEditView: React.FC<CharacterEditViewProps> = ({
  projectId,
  storyId,
  character,
  onBack,
  onSave,
  title,
}) => {
  const isNew = character === null;

  // Basic form state
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [presenceAndExpression, setPresenceAndExpression] = useState('');
  const [innerOrientation, setInnerOrientation] = useState('');
  const [sensitivityAndPull, setSensitivityAndPull] = useState('');
  const [externalConstraints, setExternalConstraints] = useState('');
  const [roleInStory, setRoleInStory] = useState('');
  const [tier, setTier] = useState<CharacterTier>('secondary');
  const [saving, setSaving] = useState(false);

  // Load character data when editing
  useEffect(() => {
    if (character) {
      setName(character.name || '');
      setAliases(character.aliases || '');
 
      const loadedTier = (character as any).tier;
      setTier(isCharacterTier(loadedTier) ? loadedTier : 'secondary');

      setPresenceAndExpression(character.presenceAndExpression);

      // ✅ New fields (best-effort; safe fallbacks if older docs don't have them)
      setInnerOrientation((character as any).innerOrientation ?? '');
      setSensitivityAndPull((character as any).sensitivityAndPull ?? '');
      setExternalConstraints((character as any).externalConstraints ?? '');

      if (character.roleInStory) {
        setRoleInStory(character.roleInStory);
      }
    } else {
      // Reset form for new character
      setName('');
      setAliases('');
      setPresenceAndExpression('');
      setInnerOrientation('');
      setSensitivityAndPull('');
      setExternalConstraints('');
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

        presenceAndExpression,
        innerOrientation: innerOrientation.trim(),
        sensitivityAndPull: sensitivityAndPull.trim(),
        externalConstraints: externalConstraints.trim(),

        identity: {
          name: name.trim(),
          aliases: aliases.trim(),
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

  const identityItems: SettingItem[] = [
    {
      id: 'name',
      type: 'text',
      label: 'Name',
      value: name,
      placeholder: 'Character name',
      onChange: setName,
    },
    {
      id: 'aliases',
      type: 'text',
      label: 'Aliases',
      value: aliases,
      placeholder: 'Character aliases, nicknames, etc.',
      onChange: setAliases,
    },
  ];

  const handleTierChange = useCallback((value: string | null) => {
    setTier((value as CharacterTier) || 'secondary');
  }, []);

  const roleItems: SettingItem[] = [
    {
      id: 'importanceSelect',
      type: 'select',
      label: 'Importance',
      value: tier,
      onChange: handleTierChange,
      data: [
        { value: 'primary', label: 'Primary' },
        { value: 'significant', label: 'Significant' },
        { value: 'secondary', label: 'Secondary' },
      ]
    },
    {
      id: 'narrative-role',
      type: 'text',
      label: 'Narrative role',
      value: roleInStory,
      placeholder: 'e.g. investigator, witness, catalyst, mentor',
      onChange: setRoleInStory,
    },
  ];

  return (
    <Box className={styles.root}>
      <Box className={styles.topOverlay}/>
      <Box className={styles.topNavigation}>
        <TopNavigation title={title} onBack={onBack} />
      </Box>
      <ScrollArea
        className={styles.scrollArea}
        style={{ height: '100%' }}
        type="auto"
        scrollbarSize={8}
      >
        <Stack gap="lg" pt={120} pb={40}>
          <Box w={600} ml="auto" mr="auto">
            {/* Form fields */}
            <Stack gap="xl">
              <Stack gap={4}>
                <SettingsGroupLabel
                  label="Identity"
                />
                <SettingsGroup items={identityItems}/>
                <SettingsGroupLabel
                  description="What do you call the character? And does it go under any other names? Or is it referenced to in ways other than its name? Either in the text or in the outline, brief etc?"
                />
              </Stack>

              <Stack gap={4}>
                <SettingsGroupLabel
                  label="Role & Significance"
                />
                <SettingsGroup items={roleItems}/>
                <SettingsGroupLabel
                  description="Choose how central this character is to the story’s core arc. This affects how much narrative focus, development, and influence the character has on the plot. And what role does this character play in the story’s structure — not their personality or backstory. Try to answer: “What does this character do for the story?"
                />
              </Stack>

              <Textarea
                label="Presence & Expression (what others see and feel)"
                description="How the character comes across — physically, socially, and behaviorally. Physical presence, behavioral signals, social & cultural markers etc."
                placeholder=""
                value={presenceAndExpression}
                autosize
                minRows={4}
                onChange={setPresenceAndExpression}
              />

              <Textarea
                label="Inner orientation (what quietly guides them)"
                description="The inner direction that shapes choices and behavior — values, morale, a belief, longing, habit, comfort, or tension. This doesn’t have to be a problem to overcome."
                placeholder=""
                value={innerOrientation}
                autosize
                minRows={4}
                onChange={setInnerOrientation}
              />

              <Textarea
                label="Sensitivity & pull (what affects them most)"
                description="Situations, topics, or dynamics that reliably draw them in or make them withdraw — including triggers, avoids, soft spots, and temptations."
                placeholder=""
                value={sensitivityAndPull}
                autosize
                minRows={4}
                onChange={setSensitivityAndPull}
              />

              <Textarea
                label="External constraints (what limits choice)"
                description="Forces outside the character that shape what’s possible — people, institutions, environment, obligations, social context, time, money, health, etc."
                placeholder=""
                value={externalConstraints}
                autosize
                minRows={4}
                onChange={setExternalConstraints}
              />

              {/* Save button */}
              <Group mt="md">
                <Button onClick={handleSave} disabled={!name.trim() || saving} loading={saving}>
                  {isNew ? 'Create Character' : 'Save Changes'}
                </Button>
              </Group>
            </Stack>
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
};