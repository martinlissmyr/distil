// src/ui/playground/WizardTesterRunnerView.tsx
import React, { useMemo, useState } from 'react';
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
  Divider,
} from '@mantine/core';
import { useEditor, EditorContent } from '@tiptap/react';

import { useAppStore } from '../../state/useAppStore';
import { getWizardConfig } from '../../wizards/registry';
import type { WizardConfig } from '../../wizards/types';
import type { EditorKind } from '../../types/chat';

import { metaExtensions } from '../editor/extensions/metaExtensions';
import { defaultEmptyDoc } from '../editor/defaultEmptyDoc';

import { findTestableLlmSteps, type TestableLlmStep } from '../../wizards/testUtils';
import { IsolatedLlmStepTester } from './IsolatedLlmStepTester';
import { useEditorChat } from '../../hooks/useEditorChat';
import { getContextDocs } from '../../chat/contextSelector';

import type { WizardId } from '../../wizards/types';

type RightPanelMode = 'empty' | 'editor' | 'test';

export const WizardTesterRunnerView: React.FC<{ wizardId: WizardId }> = ({ wizardId }) => {
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('empty');
  const [selectedTestStep, setSelectedTestStep] = useState<TestableLlmStep | null>(null);

  const activeWizard = useAppStore((s) => s.activeWizard);

  const selectedWizardConfig: WizardConfig = useMemo(() => getWizardConfig(wizardId), [wizardId]);

  const testableLlmSteps: TestableLlmStep[] = useMemo(
    () => findTestableLlmSteps(selectedWizardConfig),
    [selectedWizardConfig]
  );

  // TipTap editor instance (local to runner)
  const editor = useEditor({
    extensions: metaExtensions({ placeholder: 'Wizard output will appear here...' }),
    content: defaultEmptyDoc,
  });

  const projectId = 'test-project';
  const storyId = 'test-story';

  // Initialize hook with minimal static config
  const { handleOpenWizard } = useEditorChat({
    chatConfig: {
      projectId,
      storyId,
      llmContext: { kinds: [], markdown: '' },
    },
  });

  const handleRunWizard = async () => {
    if (!editor || activeWizard) return;

    // Build chat context dynamically
    const docKind = selectedWizardConfig.targetDoc as EditorKind;

    const doc =
      docKind === 'manifest'
        ? { scope: 'root' as const, docKind }
        : {
            scope: 'story' as const,
            docKind,
            projectId,
            storyId,
          };

    const {
      kinds: contextKinds,
      markdown: contextMarkdown,
    } = await getContextDocs(docKind, '', projectId, storyId, {
      language: 'sv',
    });

    // Clear previous editor content
    editor.commands.setContent(defaultEmptyDoc);

    // Pass context directly to handleOpenWizard
    handleOpenWizard({
      wizardId,
      editor,
      chatConfig: {
        doc,
        docKind,
        projectId,
        storyId,
        llmContext: {
          kinds: contextKinds || [],
          markdown: contextMarkdown || '',
        },
      },
    });

    setSelectedTestStep(null);
    setRightPanelMode('editor');
  };

  const handleTestStep = (testableStep: TestableLlmStep) => {
    setSelectedTestStep(testableStep);
    setRightPanelMode('test');
  };

  return (
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
          <Button onClick={handleRunWizard} disabled={activeWizard !== null} fullWidth size="md">
            Run Wizard
          </Button>

          <Divider />

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

        {rightPanelMode === 'test' && selectedTestStep && (
          <IsolatedLlmStepTester
            testableStep={selectedTestStep}
            wizard={{
              wizardId,
              storyId,
              projectId,
              docKind: selectedWizardConfig.targetDoc
            }}
          />
        )}
      </Paper>
    </Group>
  );
};