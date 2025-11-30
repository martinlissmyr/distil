// src/components/playground/WizardTesterView.tsx
import React, { useState, useEffect } from 'react';
import { Box, Stack, Group, Paper, Text, Button, Title, Badge, Divider, ScrollArea } from '@mantine/core';
import { useAppStore } from '../../state/useAppStore';
import { getAvailableWizards, loadWizardConfig } from '../../wizards/validation';
import type { EditorKind } from '../../types/chat';
import type { WizardConfig } from '../../wizards/types';

export const WizardTesterView: React.FC = () => {
  const [selectedWizardId, setSelectedWizardId] = useState<string | null>(null);
  const [mockEditorContent, setMockEditorContent] = useState<string>('');

  const availableWizards = getAvailableWizards();
  const activeWizard = useAppStore((s) => s.activeWizard);
  const wizardResult = useAppStore((s) => s.wizardResult);

  // Watch for wizard completion and update mock editor
  useEffect(() => {
    if (wizardResult) {
      setMockEditorContent(wizardResult);
    }
  }, [wizardResult]);

  // Get selected wizard config info
  const selectedWizardConfig: WizardConfig | null = selectedWizardId
    ? loadWizardConfig(selectedWizardId)
    : null;

  const handleSelectWizard = async (wizardId: string) => {
    setSelectedWizardId(wizardId);

    // Launch the wizard immediately when selected
    if (activeWizard) return; // Don't launch if one is already running

    // Clear previous editor content
    setMockEditorContent('');

    const config = loadWizardConfig(wizardId);
    const { startWizard } = useAppStore.getState();

    // Use the wizard's targetDoc as the editor kind
    const editorKind = config.targetDoc as EditorKind;

    // Determine target scope based on editor kind
    const targetScope =
      editorKind === 'manifest'
        ? { kind: 'root' as const }
        : editorKind === 'brief' || editorKind === 'outline' || editorKind === 'prose'
        ? {
            kind: 'story' as const,
            projectId: 'test-project',
            storyId: 'test-story',
          }
        : { kind: 'root' as const };

    await startWizard(wizardId, {
      editorKind,
      targetScope,
      targetKey: config.targetDoc,
    });
  };

  return (
    <Group gap="md" style={{ flex: 1, minHeight: 0, height: '100%' }} grow align="flex-start">
      {/* Left Column - Wizard List & Context */}
      <Stack gap="lg" p="sm" style={{ minHeight: 0, height: '100%', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)' }}>
        <Paper p="md">
          <Stack gap="md">
            <Title order={5}>Available Wizards</Title>
            <ScrollArea style={{ maxHeight: 300 }}>
              <Stack gap="xs">
                {availableWizards.map((wizardId) => {
                  const config = loadWizardConfig(wizardId);
                  const isSelected = wizardId === selectedWizardId;

                  return (
                    <Paper
                      key={wizardId}
                      p="sm"
                      withBorder
                      style={{
                        cursor: activeWizard ? 'not-allowed' : 'pointer',
                        backgroundColor: isSelected ? 'var(--mantine-color-blue-light)' : undefined,
                        borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
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
        </Paper>
      </Stack>

      {/* Right Column - Mock Editor */}
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
        <Paper p="md" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack gap="md" style={{ flex: 1, height: '100%' }}>
            <Group justify="space-between">
              <Title order={5}>Mock Editor Output</Title>
              {selectedWizardConfig && (
                <Badge size="lg" variant="light">
                  {selectedWizardConfig.targetDoc}
                </Badge>
              )}
            </Group>
            <Divider />

            {mockEditorContent ? (
              <ScrollArea style={{ flex: 1 }}>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {mockEditorContent}
                </Text>
              </ScrollArea>
            ) : (
              <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text size="sm" c="dimmed" ta="center">
                  {selectedWizardConfig ? (
                    <>
                      Complete the wizard to see the generated output here.
                      <br />
                      <br />
                      This simulates a <strong>{selectedWizardConfig.targetDoc}</strong> editor.
                    </>
                  ) : (
                    'Select a wizard from the list to begin'
                  )}
                </Text>
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    </Group>
  );
};
