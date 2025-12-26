// src/components/playground/WizardTesterView.tsx
import React, { useState } from 'react';
import {
  Box,
  Stack,
  Group,
  Paper,
  Text,
  Title,
  Badge,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import { useAppStore } from '../../state/useAppStore';
import { listWizardIds, getWizardConfig } from '../../wizards/registry';
import { metaExtensions } from '../editor/extensions/metaExtensions';
import { defaultEmptyDoc } from '../editor/defaultEmptyDoc';
import type { EditorKind } from '../../types/chat';
import type { WizardConfig, WizardId } from '../../wizards/types';

export const WizardTesterView: React.FC = () => {
  const [selectedWizardId, setSelectedWizardId] = useState<WizardId | null>(null);

  const availableWizards = listWizardIds();
  const activeWizard = useAppStore((s) => s.activeWizard);

  // Create TipTap editor instance
  const editor = useEditor({
    extensions: metaExtensions({ placeholder: 'Wizard output will appear here...' }),
    content: defaultEmptyDoc,
  });

  // Get selected wizard config info
  const selectedWizardConfig: WizardConfig | null = selectedWizardId
    ? getWizardConfig(selectedWizardId)
    : null;

  const handleSelectWizard = async (wizardId: WizardId) => {
    setSelectedWizardId(wizardId);

    // Launch the wizard immediately when selected
    if (activeWizard) return; // Don't launch if one is already running
    if (!editor) return; // Wait for editor to be ready

    // Clear previous editor content
    editor.commands.setContent(defaultEmptyDoc);

    const config = getWizardConfig(wizardId);
    const { startWizard } = useAppStore.getState();

    // Use the wizard's targetDoc as the editor kind
    const docKind = config.targetDoc as EditorKind;

    // Build unified doc ref based on editor kind
    const ref =
      docKind === 'manifest'
        ? { scope: 'root' as const, docKind }
        : docKind === 'brief' || docKind === 'outline' || docKind === 'prose'
          ? {
              scope: 'story' as const,
              docKind,
              projectId: 'test-project',
              storyId: 'test-story',
            }
          : { scope: 'root' as const, docKind };

    await startWizard(wizardId, {
      ref,
      targetKey: config.targetDoc,
      targetEditor: editor, // Pass the editor instance
    });
  };

  return (
    <Group gap="md" style={{ flex: 1, minHeight: 0, height: '100%' }} grow align="flex-start">
      {/* Left Column - Wizard List & Context */}
      <Stack
        gap="lg"
        p="sm"
        style={{
          minHeight: 0,
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--overlay)',
        }}
      >
        <ScrollArea style={{ flex: '1 1 0' }}>
          <Stack gap="xs">
            {availableWizards.map((wizardId) => {
              const config = getWizardConfig(wizardId);
              const isSelected = wizardId === selectedWizardId;

              return (
                <Paper
                  key={wizardId}
                  p="sm"
                  radius="sm"
                  withBorder
                  style={{
                    cursor: activeWizard ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected
                      ? 'var(--mantine-color-blue-light)'
                      : undefined,
                    borderColor: isSelected
                      ? 'var(--mantine-color-blue-6)'
                      : undefined,
                    opacity: activeWizard ? 0.6 : 1,
                  }}
                  onClick={() => handleSelectWizard(wizardId)}
                >
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {config.title}
                      </Text>
                      <Badge size="sm">{config.targetDoc}</Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {config.description}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {config.steps.length} step{config.steps.length !== 1 ? 's' : ''}
                    </Text>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* Right Column - TipTap Editor */}
      <Box
        p="sm"
        style={{
          minHeight: 0,
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--overlay)',
        }}
      >
        <Paper p="md" radius="sm" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack gap="md" style={{ flex: 1, height: '100%', minHeight: 0 }}>
            <Group justify="space-between">
              <Title order={5}>Editor Output</Title>
              {selectedWizardConfig && (
                <Badge size="lg" variant="light">
                  {selectedWizardConfig.targetDoc}
                </Badge>
              )}
            </Group>

            {/* TipTap Editor */}
            <Box
              className="wizard-tester-editor"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'var(--mantine-color-dark-8)',
              }}
            >
              <EditorContent editor={editor} />
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Group>
  );
};