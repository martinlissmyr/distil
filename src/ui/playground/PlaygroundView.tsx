// src/ui/playground/PlaygroundView.tsx
import React, { useState, useEffect } from 'react';
import { Box, Stack, SegmentedControl } from '@mantine/core';
import { ContextDeterminatorTest } from './ContextDeterminatorTest';
import { InitialHintsTest } from './InitialHintsTest';
import { WizardTesterView } from './WizardTesterView';
import { PromptBuilderView } from './PromptBuilderView';
import { PlaygroundSummarization } from './PlaygroundSummarization';

type PlaygroundMode =
  | 'prompt-builder'
  | 'context-determinator'
  | 'initial-hints-test'
  | 'wizard-tester'
  | 'summarization';

const PLAYGROUND_MODE_KEY = 'distil:playgroundMode:v1';

function loadPlaygroundMode(): PlaygroundMode {
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_MODE_KEY);
    if (!raw) return 'prompt-builder';
    const parsed = raw as PlaygroundMode;

    const validModes: PlaygroundMode[] = [
      'prompt-builder',
      'context-determinator',
      'initial-hints-test',
      'wizard-tester',
      'summarization',
    ];
    if (validModes.includes(parsed)) return parsed;

    return 'prompt-builder';
  } catch {
    return 'prompt-builder';
  }
}

function savePlaygroundMode(mode: PlaygroundMode) {
  try {
    window.localStorage.setItem(PLAYGROUND_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export const PlaygroundView: React.FC = () => {
  const [mode, setMode] = useState<PlaygroundMode>(() => loadPlaygroundMode());

  useEffect(() => {
    savePlaygroundMode(mode);
  }, [mode]);

  return (
    <Box p="md" h="100vh" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Stack gap="sm" mb="sm">
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as PlaygroundMode)}
          data={[
            { label: 'Prompt Builder', value: 'prompt-builder' },
            { label: 'Context Determinator', value: 'context-determinator' },
            { label: 'Initial Hints', value: 'initial-hints-test' },
            { label: 'Wizard Tester', value: 'wizard-tester' },
            { label: 'Summarization', value: 'summarization' },
          ]}
        />
      </Stack>

      {mode === 'summarization' ? (
        <PlaygroundSummarization />
      ) : mode === 'wizard-tester' ? (
        <WizardTesterView />
      ) : mode === 'initial-hints-test' ? (
        <InitialHintsTest />
      ) : mode === 'context-determinator' ? (
        <ContextDeterminatorTest />
      ) : (
        <PromptBuilderView />
      )}
    </Box>
  );
};