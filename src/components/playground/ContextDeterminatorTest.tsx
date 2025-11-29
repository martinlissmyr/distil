// src/components/playground/ContextDeterminatorTest.tsx
import React, { useState } from 'react';
import { Stack, Textarea, Button, Paper, Text, Group, Badge, Code, Title, Divider, Box } from '@mantine/core';
import { determineContextNeeds, LLM_CONTEXT_CLASSIFICATION_PROMPT } from '../../chat/contextSelector';

type HeuristicResult = {
  needsBrief: boolean;
  needsOutline: boolean;
  confidence: number;
};

type LLMResult = {
  needsBrief: boolean;
  needsOutline: boolean;
};

export const ContextDeterminatorTest: React.FC = () => {
  const [userPrompt, setUserPrompt] = useState('Hur är grammatiken?');
  const [isLoading, setIsLoading] = useState(false);
  const [heuristicResult, setHeuristicResult] = useState<HeuristicResult | null>(null);
  const [finalResult, setFinalResult] = useState<{ needsBrief: boolean; needsOutline: boolean } | null>(null);
  const [usedLLM, setUsedLLM] = useState(false);
  const [llmPrompt, setLLMPrompt] = useState<string | null>(null);
  const [llmResponse, setLLMResponse] = useState<LLMResult | null>(null);

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

      // We need to access the internal heuristic function
      // For now, let's call determineContextNeeds and trace through it
      // We'll need to expose more internals or duplicate the logic here

      // Call the actual function
      const result = await determineContextNeeds(userPrompt, {
        useIntelligent: true,
        apiKey,
        language: 'sv'
      });

      setFinalResult(result);

      // For now, we'll need to manually run the heuristic to show the score
      // Let's duplicate the heuristic logic here for display purposes
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
          {/* Step 1: Quick Heuristic Check */}
          {heuristicResult && (
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Title order={5}>Step 1: Quick Heuristic Check</Title>
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
          )}

          {/* Step 2: Confidence Check */}
          {heuristicResult && (
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Title order={5}>Step 2: Confidence Check</Title>
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
          )}

          {/* Step 3: LLM Classification (conditional) */}
          {usedLLM && llmPrompt && (
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Title order={5}>Step 3: LLM Classification (GPT-4o-mini)</Title>

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
          {finalResult && (
            <Paper p="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-blue-6)', backgroundColor: 'var(--mantine-color-blue-light)' }}>
              <Stack gap="sm">
                <Title order={5}>Final Result</Title>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Will include Brief:</Text>
                  <Badge color={finalResult.needsBrief ? 'green' : 'gray'} size="lg">
                    {finalResult.needsBrief ? 'Yes' : 'No'}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Will include Outline:</Text>
                  <Badge color={finalResult.needsOutline ? 'green' : 'gray'} size="lg">
                    {finalResult.needsOutline ? 'Yes' : 'No'}
                  </Badge>
                </Group>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Box>
    </Group>
  );
};
