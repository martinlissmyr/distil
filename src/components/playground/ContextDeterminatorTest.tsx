// src/components/playground/ContextDeterminatorTest.tsx
import React, { useState } from 'react';
import { Stack, Textarea, Button, Paper, Text, Group, Badge, Code, Title, Divider, Box, SegmentedControl } from '@mantine/core';
import { determineContextNeeds, LLM_CONTEXT_CLASSIFICATION_PROMPT } from '../../chat/contextSelector';
import { getContextRules } from '../../chat/contextRules';
import type { EditorKind } from '../../types/chat';
import type { MetaDocKey } from '../../types/metaDoc';

type HeuristicResult = {
  needsBrief: boolean;
  needsOutline: boolean;
  confidence: number;
};

type LLMResult = {
  needsBrief: boolean;
  needsOutline: boolean;
};

type ContextSource = 'story' | 'manifest';

export const ContextDeterminatorTest: React.FC = () => {
  const [userPrompt, setUserPrompt] = useState('Hur är grammatiken?');
  const [contextSource, setContextSource] = useState<ContextSource>('story');
  const [editorKind, setEditorKind] = useState<EditorKind>('prose');
  const [isLoading, setIsLoading] = useState(false);
  const [heuristicResult, setHeuristicResult] = useState<HeuristicResult | null>(null);
  const [finalResult, setFinalResult] = useState<{ needsBrief: boolean; needsOutline: boolean } | null>(null);
  const [usedLLM, setUsedLLM] = useState(false);
  const [llmPrompt, setLLMPrompt] = useState<string | null>(null);
  const [llmResponse, setLLMResponse] = useState<LLMResult | null>(null);

  // Reset results when context source or editor kind changes
  const resetResults = () => {
    setHeuristicResult(null);
    setFinalResult(null);
    setUsedLLM(false);
    setLLMPrompt(null);
    setLLMResponse(null);
  };

  const handleTest = async () => {
    if (!userPrompt.trim()) return;

    setIsLoading(true);
    setHeuristicResult(null);
    setFinalResult(null);
    setUsedLLM(false);
    setLLMPrompt(null);
    setLLMResponse(null);

    try {
      // Get API key
      const apiKeyResponse = await window.settings.getApiKey();
      const apiKey = apiKeyResponse.ok && apiKeyResponse.data ? apiKeyResponse.data : undefined;

      // Get context rules for the selected editor kind
      const actualEditorKind: EditorKind = contextSource === 'manifest' ? 'manifest' : editorKind;
      const rules = getContextRules(actualEditorKind);

      // Start with documents that should always be included
      const result: { needsBrief: boolean; needsOutline: boolean } = {
        needsBrief: rules.alwaysInclude.includes('brief'),
        needsOutline: rules.alwaysInclude.includes('outline'),
      };

      // Only run intelligent selection if there are documents to intelligently select
      if (rules.intelligentlySelect.length > 0) {
        const contextNeeds = await determineContextNeeds(userPrompt, {
          useIntelligent: true,
          apiKey,
          language: 'sv'
        });

        // Merge intelligent selection results
        if (rules.intelligentlySelect.includes('brief')) {
          result.needsBrief = contextNeeds.needsBrief;
        }
        if (rules.intelligentlySelect.includes('outline')) {
          result.needsOutline = contextNeeds.needsOutline;
        }

        // Show the heuristic results for the Playground UI
        const lowerPrompt = userPrompt.toLowerCase();

        // Swedish keywords
        const briefKeywords = [
          'brief', 'briefen', 'premiss', 'koncept', 'tema', 'ton', 'stil',
          'genre', 'målgrupp', 'sammanfattning', 'elevator pitch',
          'vad handlar', 'övergripande', 'helhet',
          'huvudidé', 'grundidé', 'kärnidé', 'berättelseidé'
        ];
        const outlineKeywords = [
          'outline', 'outlinen', 'plot', 'plott', 'struktur', 'disposition', 'sekvens',
          'kapitel', 'akt', 'tidslinje', 'berättarbåge',
          'progression', 'vad händer', 'flöde', 'handlingen',
          'händelseförlopp', 'kronologi', 'berättelsegång'
        ];

        const briefMatches = briefKeywords.filter(kw => lowerPrompt.includes(kw)).length;
        const outlineMatches = outlineKeywords.filter(kw => lowerPrompt.includes(kw)).length;
        const totalMatches = briefMatches + outlineMatches;

        // Check for explicit mentions
        const explicitBrief = lowerPrompt.includes('brief');
        const explicitOutline = lowerPrompt.includes('outline') || lowerPrompt.includes('outlinen');

        let confidence = 0;
        if (explicitBrief || explicitOutline) {
          confidence = 0.9;
        } else if (totalMatches >= 3) {
          confidence = 0.9;
        } else if (totalMatches === 2) {
          confidence = 0.7;
        } else if (totalMatches === 1) {
          confidence = 0.5;
        } else {
          confidence = 0.2;
        }

        setHeuristicResult({
          needsBrief: briefMatches > 0,
          needsOutline: outlineMatches > 0,
          confidence
        });

        // If confidence was < 0.7, we used LLM
        if (confidence < 0.7 && apiKey) {
          setUsedLLM(true);
          // The LLM was called, show the prompt and response
          setLLMPrompt(`SYSTEM PROMPT:
${LLM_CONTEXT_CLASSIFICATION_PROMPT}

USER PROMPT:
${userPrompt}`);
          setLLMResponse(result);
        }
      }

      setFinalResult(result);

    } catch (error) {
      console.error('Error testing context determination:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'green';
    if (confidence >= 0.5) return 'yellow';
    return 'red';
  };

  return (
    <Group gap="md" style={{ flex: 1, minHeight: 0, height: '100%' }} grow align="flex-start">
      {/* Left Column - Input */}
      <Stack gap="lg" p="sm" style={{ minHeight: 0, height: "100%", flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)' }}>
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">Context Source</Text>
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
              <Text size="sm" fw={500} mb="xs">Editor Kind</Text>
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
      <Box p="sm" style={{ minHeight: 0, height: "100%", flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)', overflow: 'auto' }}>
        <Stack gap="md">
          {/* Step 1: Context Rules Reasoning */}
          {finalResult && (() => {
            const actualEditorKind: EditorKind = contextSource === 'manifest' ? 'manifest' : editorKind;
            const rules = getContextRules(actualEditorKind);

            // Don't show the document being edited as a potential context
            const potentialContextDocs: MetaDocKey[] = ['manifest', 'brief', 'outline'].filter(
              (doc) => doc !== actualEditorKind
            );

            const getDocumentBadge = (docKey: MetaDocKey) => {
              if (rules.alwaysInclude.includes(docKey)) {
                return <Badge color="green">Always Include</Badge>;
              } else if (rules.neverInclude.includes(docKey)) {
                return <Badge color="red">Never Include</Badge>;
              } else if (rules.intelligentlySelect.includes(docKey)) {
                return <Badge color="blue">Intelligent Selection</Badge>;
              }
              return <Badge color="gray">Not Applicable</Badge>;
            };

            const getDocumentLabel = (docKey: MetaDocKey): string => {
              return docKey.charAt(0).toUpperCase() + docKey.slice(1);
            };

            return (
              <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-indigo-6)' }}>
                <Stack gap="sm">
                  <Title order={5}>Step 1: Context Rules ({actualEditorKind})</Title>
                  <Text size="sm" c="dimmed">
                    Potential context documents for this editor:
                  </Text>

                  <Stack gap="xs">
                    {potentialContextDocs.map((docKey) => (
                      <Group gap="xs" key={docKey}>
                        <Text size="sm" fw={500} style={{ width: '80px' }}>{getDocumentLabel(docKey)}:</Text>
                        {getDocumentBadge(docKey)}
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            );
          })()}

          {heuristicResult && (() => {
            const actualEditorKind: EditorKind = contextSource === 'manifest' ? 'manifest' : editorKind;
            const rules = getContextRules(actualEditorKind);
            if (rules.intelligentlySelect.length === 0) return null;

            return (
              <>
                <Paper p="md" withBorder>
                  <Stack gap="sm">
                    <Title order={5}>Step 2: Quick Heuristic Check</Title>
                    <Group gap="xs">
                      <Text size="sm">Needs Brief:</Text>
                      <Badge color={heuristicResult.needsBrief ? 'blue' : 'gray'}>
                        {heuristicResult.needsBrief ? 'Yes' : 'No'}
                      </Badge>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm">Needs Outline:</Text>
                      <Badge color={heuristicResult.needsOutline ? 'blue' : 'gray'}>
                        {heuristicResult.needsOutline ? 'Yes' : 'No'}
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>

                <Paper p="md" withBorder>
                  <Stack gap="sm">
                    <Title order={5}>Step 3: Confidence Check</Title>
                    <Group gap="xs">
                      <Text size="sm">Confidence Level:</Text>
                      <Badge color={getConfidenceColor(heuristicResult.confidence)} size="lg">
                        {(heuristicResult.confidence * 100).toFixed(0)}%
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Threshold: 70%
                    </Text>
                    {heuristicResult.confidence >= 0.7 ? (
                      <Paper p="sm" withBorder style={{ borderLeft: '3px solid var(--mantine-color-green-6)', backgroundColor: 'var(--mantine-color-green-light)' }}>
                        <Text size="sm" fw={500}>
                          ✓ Above threshold - Using heuristic result
                        </Text>
                      </Paper>
                    ) : (
                      <Paper p="sm" withBorder style={{ borderLeft: '3px solid var(--mantine-color-orange-6)', backgroundColor: 'var(--mantine-color-orange-light)' }}>
                        <Text size="sm" fw={500}>
                          ⚠ Below threshold - Proceeding to LLM classification
                        </Text>
                      </Paper>
                    )}
                  </Stack>
                </Paper>
              </>
            );
          })()}

          {usedLLM && llmPrompt && (
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Title order={5}>Step 4: LLM Classification (GPT-4o-mini)</Title>

                <Text size="sm" fw={500}>Prompt sent to ChatGPT:</Text>
                <Code block style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                  {llmPrompt}
                </Code>

                {llmResponse && (
                  <>
                    <Text size="sm" fw={500} mt="md">Response:</Text>
                    <Code block style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                      {JSON.stringify(llmResponse, null, 2)}
                    </Code>
                  </>
                )}
              </Stack>
            </Paper>
          )}

          {/* Final Result */}
          {finalResult && (() => {
            const actualEditorKind: EditorKind = contextSource === 'manifest' ? 'manifest' : editorKind;

            // Build list of documents to show (excluding the main document being edited)
            const documentsToShow: Array<{ key: MetaDocKey; label: string; included: boolean }> = [];

            if (actualEditorKind !== 'manifest') {
              documentsToShow.push({ key: 'manifest', label: 'Manifest', included: true }); // Manifest always shown for non-manifest editors
            }
            if (actualEditorKind !== 'brief') {
              documentsToShow.push({ key: 'brief', label: 'Brief', included: finalResult.needsBrief });
            }
            if (actualEditorKind !== 'outline') {
              documentsToShow.push({ key: 'outline', label: 'Outline', included: finalResult.needsOutline });
            }

            return (
              <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-blue-6)', backgroundColor: 'var(--mantine-color-blue-light)' }}>
                <Stack gap="sm">
                  <Title order={5}>Final Result</Title>
                  {documentsToShow.map((doc) => (
                    <Group gap="xs" key={doc.key}>
                      <Text size="sm" fw={500}>Will include {doc.label}:</Text>
                      <Badge color={doc.included ? 'green' : 'gray'} size="lg">
                        {doc.included ? 'Yes' : 'No'}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            );
          })()}
        </Stack>
      </Box>
    </Group>
  );
};
