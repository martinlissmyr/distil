// src/components/playground/ContextDeterminatorTest.tsx
import React, { useState } from 'react';
import { Stack, Textarea, Button, Paper, Text, Group, Badge, Code, Title, Divider } from '@mantine/core';
import { determineContextNeeds } from '../../chat/contextSelector';

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
  const [userPrompt, setUserPrompt] = useState('');
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
        const systemPrompt = `# Role and Objective
- Assess whether a user writing question requires specific story context types (brief or outline) to be answered thoroughly. This assessment supports prompt construction for API calls.

# Instructions
- Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level.
- Determine if the writing question requires story context documents for an effective answer.
- Evaluate for the following context types:
  - Brief: High-level premise, themes, tone, character concepts
  - Outline: Plot structure, story progression, scene sequences
- Only return true for a context type if it is NECESSARY to answer well.
- After producing the output, validate that only the specified JSON object is included, with no additional text or explanations. If not, self-correct.

# Example User Prompt
- Example: "Hur står den här texten sig i förhållande till min idé?"

# Output Format
- Respond ONLY with a JSON object in the format below (no explanations or extra fields):
\`\`\`json
{
  "needsBrief": boolean,   // true only if story brief context is necessary
  "needsOutline": boolean  // true only if story outline context is necessary
}
\`\`\`
- Output both fields in the order: needsBrief, needsOutline.
- If the writing question is ambiguous or missing information for a clear answer, return false for both fields.
- Do NOT include other fields or explanations in the response.

# Verbosity
- Output should be strictly limited to the requested JSON object.

# Stop Conditions
- Stop when the JSON object meeting the above specifications is produced.`;

        setLLMPrompt(`SYSTEM PROMPT:
${systemPrompt}

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
    <Stack gap="md" style={{ height: '100%', overflow: 'auto' }} p="md">
      <Title order={3}>Context Determinator Test</Title>
      <Text size="sm" c="dimmed">
        Test how the system determines which context documents to include based on a user prompt.
      </Text>

      <Textarea
        label="User Prompt"
        placeholder="Enter a writing question in Swedish..."
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.currentTarget.value)}
        minRows={3}
        autosize
      />

      <Button onClick={handleTest} loading={isLoading} disabled={!userPrompt.trim()}>
        Test Context Determination
      </Button>

      {heuristicResult && (
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={5}>Quick Heuristic Check</Title>
              <Badge color={getConfidenceColor(heuristicResult.confidence)} size="lg">
                Confidence: {(heuristicResult.confidence * 100).toFixed(0)}%
              </Badge>
            </Group>

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

            {heuristicResult.confidence >= 0.7 ? (
              <Paper p="sm" withBorder style={{ borderLeft: '3px solid var(--mantine-color-green-6)', backgroundColor: 'var(--mantine-color-green-light)' }}>
                <Text size="sm" fw={500}>
                  ✓ Passed threshold (≥ 0.7) - Using heuristic result
                </Text>
              </Paper>
            ) : (
              <Paper p="sm" withBorder style={{ borderLeft: '3px solid var(--mantine-color-orange-6)', backgroundColor: 'var(--mantine-color-orange-light)' }}>
                <Text size="sm" fw={500}>
                  ⚠ Below threshold (&lt; 0.7) - Falling back to LLM classification
                </Text>
              </Paper>
            )}
          </Stack>
        </Paper>
      )}

      {usedLLM && llmPrompt && (
        <>
          <Divider />
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>LLM Classification (GPT-4o-mini)</Title>

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
        </>
      )}

      {finalResult && (
        <>
          <Divider />
          <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-blue-light)' }}>
            <Stack gap="sm">
              <Title order={5}>Final Result</Title>
              <Group gap="xs">
                <Text size="sm">Will include Brief:</Text>
                <Badge color={finalResult.needsBrief ? 'green' : 'gray'} size="lg">
                  {finalResult.needsBrief ? 'Yes' : 'No'}
                </Badge>
              </Group>
              <Group gap="xs">
                <Text size="sm">Will include Outline:</Text>
                <Badge color={finalResult.needsOutline ? 'green' : 'gray'} size="lg">
                  {finalResult.needsOutline ? 'Yes' : 'No'}
                </Badge>
              </Group>
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
};
