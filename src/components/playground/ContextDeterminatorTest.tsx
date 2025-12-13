// src/components/playground/ContextDeterminatorTest.tsx
import React, { useState } from 'react';
import {
  Stack,
  Textarea,
  Button,
  Paper,
  Text,
  Group,
  Badge,
  Box,
  SegmentedControl,
  Title,
  Code,
} from '@mantine/core';
import {
  determineContextNeeds,
  quickHeuristicCheck,
  buildPrompt,
  isAboveConfidenceThreshold,
  determineContextNeedsWithLLMClassification,
  type HeuristicCheckResult,
} from '../../chat/contextSelector';
import type { EditorKind } from '../../types/chat';
import type { MetaDocKey } from '../../types/metaDoc';
import { getContextRulesFor, type ContextRules } from '../../models/docs';

type ContextSource = 'story' | 'manifest';

export const ContextDeterminatorTest: React.FC = () => {
  const [userPrompt, setUserPrompt] = useState('Saknas någon scen?');
  const [contextSource, setContextSource] = useState<ContextSource>('story');
  const [editorKind, setEditorKind] = useState<EditorKind>('prose');

  const [isLoading, setIsLoading] = useState(false);

  const [llmResponse, setLLMResponse] = useState<FinalResult | null>(null);
  const [contextualCandidates, setContextualCandidates] = useState<ContextRules | null>(null);
  const [heuristicResults, setHeuristicResults] = useState<HeuristicCheckResult[] | null>(null);
  const [remainingContexts, setRemainingContexts] = useState<MetaDocKey[] | null>(null);
  const [llmPrompt, setLLMPrompt] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<MetaDocKey[] | null>(null);

  const resetResults = () => {
    setFinalResult(null);
    setLLMPrompt(null);
    setLLMResponse(null);
    setContextualCandidates(null);
    setHeuristicResults(null);
    setRemainingContexts(null);
  };

  const handleTest = async () => {
    if (!userPrompt.trim()) return;

    setIsLoading(true);
    resetResults();

    try {
      // Get API key
      const apiKeyResponse = await window.settings.getApiKey();
      const apiKey =
        apiKeyResponse.ok && apiKeyResponse.data ? apiKeyResponse.data : undefined;

      // Determine which editor kind’s rules to use
      const actualEditorKind: EditorKind =
        contextSource === 'manifest' ? 'manifest' : editorKind;

      const rules = getContextRulesFor(actualEditorKind);
      setContextualCandidates(rules);

      if (rules.intelligentlySelect.length > 0) {
        const heuristicCheckResults = quickHeuristicCheck(
          userPrompt,
          rules.intelligentlySelect,
          'sv'
        );

        setHeuristicResults(heuristicCheckResults);

        const ambiguousNeededContexts: MetaDocKey[] = [];
        const heuristicallyRelevantContexts: MetaDocKey[] = [];

        for (const { kind, confidence } of heuristicCheckResults) {
          if (isAboveConfidenceThreshold(confidence)) {
            // Strong signal → include directly
            heuristicallyRelevantContexts.push(kind);
          } else {
            // Weak signal → let LLM decide
            ambiguousNeededContexts.push(kind);
          }
        }

        if (ambiguousNeededContexts.length > 0) {
          setLLMPrompt(buildPrompt(ambiguousNeededContexts));
          setRemainingContexts(ambiguousNeededContexts);

          const { relevantContexts, result } =
            await determineContextNeedsWithLLMClassification(
              userPrompt,
              Array.from(new Set(heuristicallyRelevantContexts)),
              ambiguousNeededContexts,
              apiKey
            );

          setLLMResponse(result);
          setFinalResult([
            ...rules.alwaysInclude,
            ...relevantContexts,
          ]);
        } else {
          setFinalResult([
            ...rules.alwaysInclude,
            ...heuristicallyRelevantContexts,
          ]);
        }
      } else {
        setFinalResult(rules.alwaysInclude);
      }
    } catch (error) {
      console.error('Error testing context determination:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'green';
    return 'gray';
  };

  const getDocumentLabel = (docKey: MetaDocKey | EditorKind): string =>
    docKey.charAt(0).toUpperCase() + docKey.slice(1);

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
          <div>
            <Text size="sm" fw={500} mb="xs">
              Context Source
            </Text>
            <SegmentedControl
              value={contextSource}
              onChange={(value) => {
                setContextSource(value as ContextSource);
                resetResults();
              }}
              data={[
                { label: 'Story', value: 'story' },
                { label: 'Manifest', value: 'manifest' },
              ]}
              fullWidth
            />
          </div>

          {contextSource === 'story' && (
            <div>
              <Text size="sm" fw={500} mb="xs">
                Editor Kind
              </Text>
              <SegmentedControl
                value={editorKind}
                onChange={(value) => {
                  setEditorKind(value as EditorKind);
                  resetResults();
                }}
                data={[
                  { label: 'Prose', value: 'prose' },
                  { label: 'Brief', value: 'brief' },
                  { label: 'Outline', value: 'outline' },
                  { label: 'World', value: 'world' },
                ]}
                fullWidth
              />
            </div>
          )}
        </Stack>

        <Textarea
          label="User Prompt"
          placeholder="Enter a writing question in Swedish..."
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.currentTarget.value)}
          minRows={3}
          autosize
        />

        <Button
          onClick={handleTest}
          loading={isLoading}
          disabled={!userPrompt.trim()}
          fullWidth
        >
          Test Context Determination
        </Button>
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
          {/* Step 1: Context Rules Reasoning */}
          {contextualCandidates && (() => {
            const getDocumentBadge = (docKey: MetaDocKey) => {
              if (contextualCandidates.alwaysInclude.includes(docKey)) {
                return <Badge color="green">Always Include</Badge>;
              } else if (contextualCandidates.intelligentlySelect.includes(docKey)) {
                return <Badge color="blue">Intelligent Selection</Badge>;
              }
              return <Badge color="gray">Not Applicable</Badge>;
            };

            const docs: MetaDocKey[] = Array.from(
              new Set([
                ...contextualCandidates.alwaysInclude,
                ...contextualCandidates.intelligentlySelect,
              ])
            );

            return (
              <Paper
                p="md"
                withBorder
                style={{ borderLeft: '4px solid var(--mantine-color-indigo-6)' }}
              >
                <Stack gap="sm">
                  <Title order={5}>
                    Context Selection Rules for {getDocumentLabel(editorKind)}
                  </Title>

                  <Stack gap="xs">
                    {docs.map((docKey) => (
                      <Group gap="xs" key={docKey}>
                        <Text size="sm" fw={500} style={{ width: '80px' }}>
                          {getDocumentLabel(docKey)}:
                        </Text>
                        {getDocumentBadge(docKey)}
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            );
          })()}

          {heuristicResults && (() => {
            return (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>Quick Heuristic Check</Title>
                  <Text size="sm" fw={500}>
                    Using a simple heuristic check to see if intelligently selectable
                    context kinds should be included.
                  </Text>
                  {heuristicResults.map((result) => (
                    <Group gap="xs" key={result.kind}>
                      <Text size="sm" fw={500} style={{ width: '80px' }}>
                        {getDocumentLabel(result.kind)}:
                      </Text>
                      <Badge color={getConfidenceColor(result.confidence)}>
                        {result.confidence >= 0.7 ? 'Include' : 'Undetermined'}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            );
          })()}

          {remainingContexts && (() => {
            return (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>LLM Classification</Title>
                  <Text size="sm" fw={500}>
                    Using LLM to see if undetermined context kinds is needed.
                  </Text>
                  <Text size="sm" fw={500}>
                    Prompt sent to ChatGPT:
                  </Text>
                  <Code
                    block
                    style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}
                  >
                    {llmPrompt}
                  </Code>
                  {llmResponse && (
                    <>
                      <Text size="sm" fw={500} mt="md">
                        Response (interpreted as final inclusion):
                      </Text>
                      <Code
                        block
                        style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}
                      >
                        {JSON.stringify(llmResponse, null, 2)}
                      </Code>
                    </>
                  )}
                </Stack>
              </Paper>
            );
          })()}

          {finalResult && (() => {
            return (
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Title order={5}>Final Result</Title>
                  <Stack gap="xs">
                    {finalResult.map((docKey) => (
                      <Group gap="xs" key={docKey}>
                        <Text size="sm" fw={500} style={{ width: '80px' }}>
                          {getDocumentLabel(docKey)}:
                        </Text>
                        <Badge color="green">Included</Badge>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            );
          })()}
        </Stack>
      </Box>
    </Group>
  );
};