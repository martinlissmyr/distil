// src/ui/playground/WizardTesterView.tsx
import React, { useState } from 'react';
import {
  Box,
  Stack,
  Group,
  Paper,
  Text,
  Title,
  Button,
  Badge,
  ScrollArea,
  Select,
  Divider,
} from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';
import { useAppStore } from '../../state/useAppStore';
import { listWizardIds, getWizardConfig } from '../../wizards/registry';
import { metaExtensions } from '../editor/extensions/metaExtensions';
import { defaultEmptyDoc } from '../editor/defaultEmptyDoc';
import type { EditorKind } from '../../types/chat';
import type { WizardConfig, WizardId, WizardContext } from '../../wizards/types';
import { findTestableLlmSteps, type TestableLlmStep } from '../../wizards/testUtils';
import { IsolatedLlmStepTester } from './IsolatedLlmStepTester';

type RightPanelMode = 'empty' | 'editor' | 'test';

export const WizardTesterView: React.FC = () => {
  const [selectedWizardId, setSelectedWizardId] = useState<WizardId | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('empty');
  const [selectedTestStep, setSelectedTestStep] = useState<TestableLlmStep | null>(null);

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

  // Find testable LLM steps in selected wizard
  const testableLlmSteps: TestableLlmStep[] = selectedWizardConfig
    ? findTestableLlmSteps(selectedWizardConfig)
    : [];

  // Build wizard context
  const buildWizardContext = (wizardId: WizardId): WizardContext => {
    const config = getWizardConfig(wizardId);
    const docKind = config.targetDoc as EditorKind;

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

    return {
      ref,
      targetKey: config.targetDoc,
      targetEditor: editor,
    };
  };

  const handleRunWizard = async () => {
    if (!selectedWizardId || !editor || activeWizard) return;

    // Clear previous editor content
    editor.commands.setContent(defaultEmptyDoc);

    const { startWizard } = useAppStore.getState();
    const wizardContext = buildWizardContext(selectedWizardId);

    await startWizard(selectedWizardId, wizardContext);
    setRightPanelMode('editor');
  };

  const handleTestStep = (testableStep: TestableLlmStep) => {
    setSelectedTestStep(testableStep);
    setRightPanelMode('test');
  };

  return (
    <Stack gap="md" p="md" style={{ flex: 1, minHeight: 0, height: '100%' }}>
      {/* Top Row - Wizard Selector */}
      <Select
        placeholder="Select a wizard to test"
        value={selectedWizardId}
        onChange={(value) => {
          setSelectedWizardId(value);
          setRightPanelMode('empty');
          setSelectedTestStep(null);
        }}
        data={availableWizards.map((wizardId) => {
          const config = getWizardConfig(wizardId);
          return {
            value: wizardId,
            label: `${config.title} (${config.targetDoc})`,
          };
        })}
        searchable
        size="md"
      />

      {/* Main Content - Two Columns */}
      {selectedWizardConfig && (
        <Group gap="md" style={{ flex: 1, minHeight: 0 }} align="flex-start" grow>
          {/* Left Column - Wizard Summary & Actions */}
          <Paper
            p="md"
            radius="sm"
            withBorder
            style={{
              flex: 1,
              minHeight: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Stack gap="lg" style={{ flex: 1 }}>
              {/* Wizard Summary */}
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Title order={4}>
                    {selectedWizardConfig.steps.length} step
                    {selectedWizardConfig.steps.length !== 1 ? 's' : ''}
                  </Title>
                </Group>
                <Text size="sm" c="dimmed">
                  {selectedWizardConfig.description}
                </Text>
              </Stack>

              {/* Run Wizard Button */}
              <Button
                onClick={handleRunWizard}
                disabled={activeWizard !== null}
                fullWidth
                size="md"
              >
                Run Wizard
              </Button>

              <Divider/>

              {/* Testable LLM Steps */}
              {testableLlmSteps.length > 0 && (
                <Stack gap="md">
                  <Title order={4}>Testable LLM Steps</Title>
                  <ScrollArea style={{ flex: 1 }}>
                    <Stack gap="sm">
                      {testableLlmSteps.map((testableStep, idx) => (
                        <Stack gap={4} key={idx}>
                          <Text size="sm" fw={500}>
                            {testableStep.label}
                          </Text>
                          {testableStep.step.description && (
                            <Text size="xs" c="dimmed">
                              {testableStep.step.description}
                            </Text>
                          )}
                          <Button
                            onClick={() => handleTestStep(testableStep)}
                            size="xs"
                            variant="light"
                            fullWidth
                            mt={10}
                          >
                            Test Step
                          </Button>
                        </Stack>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Stack>
              )}
            </Stack>
          </Paper>

          {/* Right Column - Dynamic Content */}
          <Paper
            radius="sm"
            withBorder
            style={{
              flex: 1,
              minHeight: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {rightPanelMode === 'empty' && (
              <Stack align="center" justify="center" style={{ flex: 1 }}>
                <Text size="sm" c="dimmed">
                  Select an action from the left panel
                </Text>
              </Stack>
            )}

            {rightPanelMode === 'editor' && (
              <Stack gap={0} style={{ flex: 1, height: '100%', minHeight: 0 }}>
                <Group justify="space-between" p={20}>
                  <Title order={5}>Wizard Output</Title>
                  <Badge size="lg" variant="light">
                    {selectedWizardConfig.targetDoc}
                  </Badge>
                </Group>
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
            )}

            {rightPanelMode === 'test' && selectedTestStep && selectedWizardId && (
              <IsolatedLlmStepTester
                testableStep={selectedTestStep}
                wizardContext={buildWizardContext(selectedWizardId)}
              />
            )}
          </Paper>
        </Group>
      )}
    </Stack>
  );
};