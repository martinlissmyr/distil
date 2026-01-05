// src/ui/playground/InitialHintsTest.tsx
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Paper,
  Text,
  Group,
  Badge,
  Box,
  Switch,
  Title,
  Divider,
  Radio,
} from '@mantine/core';
import { Check, AlertTriangle } from 'lucide-react';
import {
  getInitialAssistantHint,
  type AssistantHint,
} from '../../chat/chatHints';
import type { MetaDocKey } from '../../types/metaDoc';
import {
  docKinds,
  type DocKindId,
  getContextRulesFor,
  getDocTitle,
} from '../../models/docs';

// Mirror what chatHints uses internally
type DocState = 'empty' | 'hasContent';

export const InitialHintsTest: React.FC = () => {
  // Target doc kind (mirrors docKinds)
  const allDocKinds = Object.keys(docKinds) as DocKindId[];
  const [targetKind, setTargetKind] = useState<DocKindId>('prose');

  // Target doc "has content?"
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize all meta-docs as "missing" by default.
  // These keys come from the doc model, not hard-coded.
  const initialUpstream: Record<MetaDocKey, boolean> = {};

  for (const key of Object.keys(docKinds) as DocKindId[]) {
    if (docKinds[key].role === 'meta') {
      initialUpstream[key as MetaDocKey] = false;
    }
  }

  const [upstreamPresence, setUpstreamPresence] =
    useState<Record<MetaDocKey, boolean>>(initialUpstream);

  const [result, setResult] = useState<AssistantHint | null>(null);

  // Reset result on targetKind change
  useEffect(() => {
    setResult(null);
  }, [targetKind]);

  // Compute the result whenever relevant state changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const selfState: DocState = isEmpty ? 'empty' : 'hasContent';

      const upstream = Object.fromEntries(
        Object.entries(upstreamPresence).map(([key, has]) => [
          key,
          has ? 'hasContent' : 'empty',
        ])
      ) as Record<MetaDocKey, DocState>;

      const hint = await getInitialAssistantHint({
        kind: targetKind,
        selfState,
        upstream,
        // include these if your HintContext requires them:
        // language,
      } as any);

      if (cancelled) return;
      setResult(hint);
    })().catch((err) => {
      console.error('[hint] Failed to compute hint:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [targetKind, isEmpty, upstreamPresence]);

  // Context rules derived from the doc model
  const rules = getContextRulesFor(targetKind);
  const relevantDocs: MetaDocKey[] = [
    ...rules.alwaysInclude,
    ...rules.intelligentlySelect,
  ];

  const toggleUpstream = (key: MetaDocKey, value: boolean) => {
    setUpstreamPresence((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Group
      gap="md"
      style={{ flex: 1, minHeight: 0, height: '100%' }}
      grow
      align="flex-start"
    >
      {/* Left Column - Input */}
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
        <Stack gap="md">
          {/* Target document selector using Radio.Card */}
          <Radio.Group
            value={targetKind}
            onChange={(value) => setTargetKind(value as DocKindId)}
            label={
              <Text size="sm" fw={500} mb="xs">
                Target document
              </Text>
            }
          >
            <Group wrap="wrap" gap="xs">
              {allDocKinds.map((k) => {
                const isActive = k === targetKind;

                return (
                  <Radio.Card
                    key={k}
                    value={k}
                    radius="md"
                    p="xs"
                    withBorder
                    style={{
                      width: 'auto',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderColor: isActive
                        ? 'var(--mantine-color-blue-6)'
                        : undefined,
                      backgroundColor: isActive
                        ? 'var(--mantine-color-blue-light)'
                        : undefined,
                      boxShadow: isActive
                        ? '0 0 0 1px var(--mantine-color-blue-6)'
                        : 'none',
                    }}
                  >
                    <Text
                      size="sm"
                      fw={600}
                      c={isActive ? 'blue' : undefined}
                    >
                      {getDocTitle(k)}
                    </Text>
                  </Radio.Card>
                );
              })}
            </Group>
          </Radio.Group>
        </Stack>

        <Paper p="md">
          <Stack gap="md">
            {/* Main Document */}
            <Group justify="space-between" align="center">
              <Group gap="xs">
                {!isEmpty ? (
                  <Check size={16} color="var(--mantine-color-green-6)" />
                ) : (
                  <AlertTriangle
                    size={16}
                    color="var(--mantine-color-orange-6)"
                  />
                )}
                <Text size="sm" fw={500}>
                  Main document ({getDocTitle(targetKind)})
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

                {relevantDocs.map((docKey, idx) => (
                  <React.Fragment key={docKey}>
                    {idx > 0 && <Divider />}
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        {upstreamPresence[docKey] ? (
                          <Check
                            size={16}
                            color="var(--mantine-color-green-6)"
                          />
                        ) : (
                          <AlertTriangle
                            size={16}
                            color="var(--mantine-color-orange-6)"
                          />
                        )}
                        <Text size="sm" fw={500}>
                          {getDocTitle(docKey)}
                        </Text>
                      </Group>
                      <Switch
                        label="Has content"
                        checked={!!upstreamPresence[docKey]}
                        onChange={(e) =>
                          toggleUpstream(docKey, e.currentTarget.checked)
                        }
                        size="xs"
                      />
                    </Group>
                  </React.Fragment>
                ))}
              </>
            )}
          </Stack>
        </Paper>
      </Stack>

      {/* Right Column - Results */}
      <Box
        p="sm"
        style={{
          minHeight: 0,
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--overlay)',
          overflow: 'auto',
        }}
      >
        <Stack gap="md">
          {result && (
            <>
              <Paper
                p="md"
                withBorder
                radius="sm"
                style={{
                  borderLeft: '4px solid var(--mantine-color-blue-6)',
                }}
              >
                <Stack gap="sm">
                  <Title order={5}>Intro Message</Title>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.introMessage || '(empty)'}
                  </Text>
                </Stack>
              </Paper>

              {result.actions.length > 0 && (
                <Paper
                  p="md"
                  radius="sm"
                  withBorder
                  style={{
                    borderLeft: '4px solid var(--mantine-color-green-6)',
                  }}
                >
                  <Stack gap="sm">
                    <Title order={5}>
                      Suggested Actions ({result.actions.length})
                    </Title>
                    {result.actions.map((action) => (
                      <Paper
                        key={action.id}
                        p="sm"
                        radius="sm"
                        withBorder
                        style={{
                          backgroundColor: 'var(--mantine-color-gray-light)',
                        }}
                      >
                        <Stack gap="xs">
                          <Group gap="xs">
                            <Text size="sm" fw={600}>
                              {action.label}
                            </Text>
                            <Badge size="sm">{action.kind}</Badge>
                          </Group>

                          {action.kind === 'prompt' && action.prompt && (
                            <>
                              <Text
                                size="xs"
                                c="dimmed"
                                style={{
                                  fontFamily: 'monospace',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                Prompt: {action.prompt}
                              </Text>
                              <Text
                                size="xs"
                                c="dimmed"
                              >
                                Message: {action.displayMessage}
                              </Text>
                            </>
                          )}

                          {action.kind === 'navigate' &&
                            action.command?.type ===
                              'navigateToStorySection' && (
                              <Text size="xs" c="dimmed">
                                Navigate to story section:{' '}
                                {action.command.section}
                              </Text>
                            )}

                          {action.kind === 'navigate' &&
                            action.command?.type === 'navigateToManifest' && (
                              <Text size="xs" c="dimmed">
                                Navigate to: Manifest (root)
                              </Text>
                            )}

                          {action.kind === 'wizard' && action.command?.type === 'openWizard' && (
                            <Text size="xs" c="dimmed">
                              Open wizard: {(action.command as any).wizardId}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              )}

              {result.actions.length === 0 && (
                <Paper
                  p="md"
                  withBorder
                  style={{
                    borderLeft: '4px solid var(--mantine-color-gray-6)',
                  }}
                >
                  <Text size="sm" c="dimmed">
                    No suggested actions for this configuration
                  </Text>
                </Paper>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Group>
  );
};