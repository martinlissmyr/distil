// src/components/playground/InitialHintsTest.tsx
import React, { useState, useEffect } from 'react';
import { Stack, Paper, Text, Group, Badge, Box, SegmentedControl, Switch, Title, Divider } from '@mantine/core';
import { Check, AlertTriangle } from 'lucide-react';
import { getInitialAssistantHint, type AssistantHint } from '../../chat/chatHints';
import { CONTEXT_RULES } from '../../chat/contextSelector';
import type { EditorKind } from '../../types/chat';
import type { MetaDocKey } from '../../types/metaDoc';

type ContextSource = 'story' | 'manifest';

export const InitialHintsTest: React.FC = () => {
  const [contextSource, setContextSource] = useState<ContextSource>('story');
  const [editorKind, setEditorKind] = useState<EditorKind>('prose');

  // Document state toggles
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasBrief, setHasBrief] = useState(false);
  const [hasOutline, setHasOutline] = useState(false);
  const [hasManifest, setHasManifest] = useState(true);

  const [result, setResult] = useState<AssistantHint | null>(null);

  // Reset when context source or editor kind changes
  useEffect(() => {
    setResult(null);
  }, [contextSource, editorKind]);

  // Compute the result whenever relevant state changes
  useEffect(() => {
    const actualEditorKind: EditorKind = contextSource === 'manifest' ? 'manifest' : editorKind;

    const hint = getInitialAssistantHint({
      kind: actualEditorKind,
      isEmpty,
      hasBrief,
      hasOutline,
      hasManifest,
    });

    setResult(hint);
  }, [contextSource, editorKind, isEmpty, hasBrief, hasOutline, hasManifest]);

  // Get relevant metaDocs for the current editor kind
  const actualEditorKind: EditorKind = contextSource === 'manifest' ? 'manifest' : editorKind;
  const rules = CONTEXT_RULES[actualEditorKind];

  // Documents that could be relevant (alwaysInclude or intelligentlySelect)
  const relevantDocs: MetaDocKey[] = [
    ...rules.alwaysInclude,
    ...rules.intelligentlySelect,
  ];

  return (
    <Group gap="md" style={{ flex: 1, minHeight: 0, height: '100%' }} grow align="flex-start">
      {/* Left Column - Input */}
      <Stack gap="lg" p="sm" style={{ minHeight: 0, height: "100%", flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)' }}>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">Context Source</Text>
            <SegmentedControl
              value={contextSource}
              onChange={(value) => setContextSource(value as ContextSource)}
              data={[
                { label: 'Story', value: 'story' },
                { label: 'Manifest', value: 'manifest' },
              ]}
              fullWidth
            />
          </div>

          {contextSource === 'story' && (
            <div>
              <Text size="sm" fw={500} mb="xs">Editor Kind</Text>
              <SegmentedControl
                value={editorKind}
                onChange={(value) => setEditorKind(value as EditorKind)}
                data={[
                  { label: 'Prose', value: 'prose' },
                  { label: 'Brief', value: 'brief' },
                  { label: 'Outline', value: 'outline' },
                ]}
                fullWidth
              />
            </div>
          )}
        </Stack>

        <Paper p="md">
          <Stack gap="md">
            {/* Main Document */}
            <Group justify="space-between" align="center">
              <Group gap="xs">
                {!isEmpty ? (
                  <Check size={16} color="var(--mantine-color-green-6)" />
                ) : (
                  <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                )}
                <Text size="sm" fw={500}>
                  Main document ({actualEditorKind})
                </Text>
              </Group>
              <Switch
                label="Has content"
                checked={!isEmpty}
                onChange={(e) => setIsEmpty(!e.currentTarget.checked)}
                size="xs"
              />
            </Group>

            {/* Context Documents */}
            {relevantDocs.length > 0 && (
              <>
                <Divider />

                {relevantDocs.includes('manifest' as MetaDocKey) && (
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      {hasManifest ? (
                        <Check size={16} color="var(--mantine-color-green-6)" />
                      ) : (
                        <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                      )}
                      <Text size="sm" fw={500}>Manifest</Text>
                    </Group>
                    <Switch
                      label="Has content"
                      checked={hasManifest}
                      onChange={(e) => setHasManifest(e.currentTarget.checked)}
                      size="xs"
                    />
                  </Group>
                )}

                {relevantDocs.includes('brief' as MetaDocKey) && (
                  <>
                    <Divider />
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        {hasBrief ? (
                          <Check size={16} color="var(--mantine-color-green-6)" />
                        ) : (
                          <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                        )}
                        <Text size="sm" fw={500}>Brief</Text>
                      </Group>
                      <Switch
                        label="Has content"
                        checked={hasBrief}
                        onChange={(e) => setHasBrief(e.currentTarget.checked)}
                        size="xs"
                      />
                    </Group>
                  </>
                )}

                {relevantDocs.includes('outline' as MetaDocKey) && (
                  <>
                    <Divider />
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        {hasOutline ? (
                          <Check size={16} color="var(--mantine-color-green-6)" />
                        ) : (
                          <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                        )}
                        <Text size="sm" fw={500}>Outline</Text>
                      </Group>
                      <Switch
                        label="Has content"
                        checked={hasOutline}
                        onChange={(e) => setHasOutline(e.currentTarget.checked)}
                        size="xs"
                      />
                    </Group>
                  </>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Stack>

      {/* Right Column - Results */}
      <Box p="sm" style={{ minHeight: 0, height: "100%", flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)', overflow: 'auto' }}>
        <Stack gap="md">
          {result && (
            <>
              <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
                <Stack gap="sm">
                  <Title order={5}>Intro Message</Title>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.introMessage || '(empty)'}
                  </Text>
                </Stack>
              </Paper>

              {result.actions.length > 0 && (
                <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
                  <Stack gap="sm">
                    <Title order={5}>Suggested Actions ({result.actions.length})</Title>
                    {result.actions.map((action) => (
                      <Paper key={action.id} p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-light)' }}>
                        <Stack gap="xs">
                          <Group gap="xs">
                            <Text size="sm" fw={600}>{action.label}</Text>
                            <Badge size="sm">{action.kind}</Badge>
                          </Group>

                          {action.kind === 'prompt' && action.prompt && (
                            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                              Prompt: {action.prompt}
                            </Text>
                          )}

                          {action.kind === 'navigate' && action.command?.type === 'navigateToStorySection' && (
                            <Text size="xs" c="dimmed">
                              Navigate to story section: {action.command.section}
                            </Text>
                          )}

                          {action.kind === 'navigate' && action.command?.type === 'navigateToManifest' && (
                            <Text size="xs" c="dimmed">
                              Navigate to: Manifest (root)
                            </Text>
                          )}

                          {action.kind === 'wizard' && action.command?.type === 'openWizard' && (
                            <Text size="xs" c="dimmed">
                              Open wizard: {action.command.wizard}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              )}

              {result.actions.length === 0 && (
                <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-gray-6)' }}>
                  <Text size="sm" c="dimmed">No suggested actions for this configuration</Text>
                </Paper>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Group>
  );
};
