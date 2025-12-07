// src/components/playground/PlaygroundView.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Stack, Title, Select, Textarea, Button, Switch, Group, Paper, SegmentedControl, Text, Grid, Divider } from '@mantine/core';
import { Check, AlertTriangle } from 'lucide-react';
import { alineaClient, type Project, type StoryMeta } from '../../api/alineaClient';
import { buildPrompt, type BuiltPrompt } from '../../chat/buildPrompt';
import type { EditorKind, QuestionScope } from '../../types/chat';
import { useAppStore } from '../../state/useAppStore';
import { jsonToMarkdown } from '../../state/markdownUtils';
import { PlaygroundOutput } from './PlaygroundOutput';
import { ContextDeterminatorTest } from './ContextDeterminatorTest';
import { InitialHintsTest } from './InitialHintsTest';
import { WizardTesterView } from './WizardTesterView';

type ContextType = 'story' | 'manifest';

type PlaygroundState = {
  // Context selection
  contextType: ContextType;
  selectedProjectId: string | null;
  selectedStoryId: string | null;
  metaDocType: EditorKind; // 'prose', 'brief', 'outline' for stories

  // Overrides (simulate empty for documents that have content)
  simulateEmptyManifest: boolean;
  simulateEmptyBrief: boolean;
  simulateEmptyOutline: boolean;
  simulateEmptyWorld: boolean;
  emptyMainDoc: boolean;

  // Scope
  scope: QuestionScope;

  // User prompt
  userPrompt: string;

  // Loaded content
  loadedTitle: string;
  loadedFullText: string;
  loadedSelection: string;
};

type PlaygroundMode = 'prompt-builder' | 'context-determinator' | 'initial-hints-test' | 'wizard-tester';

const PLAYGROUND_MODE_KEY = 'alinea:playgroundMode:v1';

// Helper functions for localStorage persistence
function loadPlaygroundMode(): PlaygroundMode {
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_MODE_KEY);
    if (!raw) return 'prompt-builder';
    const parsed = raw as PlaygroundMode;

    // Validate that it's a valid mode
    const validModes: PlaygroundMode[] = ['prompt-builder', 'context-determinator', 'initial-hints-test', 'wizard-tester'];
    if (validModes.includes(parsed)) {
      return parsed;
    }
    return 'prompt-builder';
  } catch {
    return 'prompt-builder';
  }
}

function savePlaygroundMode(mode: PlaygroundMode) {
  try {
    window.localStorage.setItem(PLAYGROUND_MODE_KEY, mode);
  } catch {
    // ignore; localStorage might be unavailable
  }
}

export const PlaygroundView: React.FC = () => {
  const [mode, setMode] = useState<PlaygroundMode>(() => loadPlaygroundMode());
  const [state, setState] = useState<PlaygroundState>({
    contextType: 'story',
    selectedProjectId: null,
    selectedStoryId: null,
    metaDocType: 'prose',
    simulateEmptyManifest: false,
    simulateEmptyBrief: false,
    simulateEmptyOutline: false,
    simulateEmptyWorld: false,
    emptyMainDoc: false,
    scope: 'text',
    userPrompt: '{{What the user actually writes}}',
    loadedTitle: '',
    loadedFullText: '',
    loadedSelection: '',
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<StoryMeta[]>([]);
  const [builtPrompt, setBuiltPrompt] = useState<BuiltPrompt | null>(null);

  // Track document content status
  const [docStatus, setDocStatus] = useState<{
    manifestHasContent: boolean;
    briefHasContent: boolean;
    worldHasContent: boolean;
    outlineHasContent: boolean;
    mainDocHasContent: boolean;
  }>({
    manifestHasContent: false,
    briefHasContent: false,
    worldHasContent: false,
    outlineHasContent: false,
    mainDocHasContent: false,
  });

  // Persist mode to localStorage whenever it changes
  useEffect(() => {
    savePlaygroundMode(mode);
  }, [mode]);

  // Load projects on mount
  useEffect(() => {
    alineaClient.listProjects().then((response) => {
      if (response.ok) setProjects(response.data);
    });
  }, []);

  // Load stories when project selected
  useEffect(() => {
    if (state.selectedProjectId) {
      alineaClient.listStories(state.selectedProjectId).then((response) => {
        if (response.ok) setStories(response.data);
      });
    } else {
      setStories([]);
    }
  }, [state.selectedProjectId]);

  // Load story content when story + metaDocType selected
  useEffect(() => {
    if (!state.selectedProjectId || !state.selectedStoryId || state.contextType !== 'story') {
      return;
    }

    const loadContent = async () => {
      const ensureMetaDocsLoaded = useAppStore.getState().ensureMetaDocsLoaded;
      const getMetaDoc = useAppStore.getState().getMetaDoc;

      if (state.metaDocType === 'prose') {
        // Load main story prose
        const response = await alineaClient.loadStory(state.selectedProjectId!, state.selectedStoryId!);
        if (response.ok) {
          const markdown = jsonToMarkdown(response.data.doc, 'prose');
          setState((s) => ({
            ...s,
            loadedTitle: response.data.title,
            loadedFullText: markdown,
          }));
          // Update main doc status
          setDocStatus((s) => ({
            ...s,
            mainDocHasContent: !!(markdown && markdown.trim().length > 0),
          }));
        }
      } else {
        // Load metaDoc (brief, world or outline)
        await ensureMetaDocsLoaded(
          { kind: 'story', projectId: state.selectedProjectId!, storyId: state.selectedStoryId! },
          [state.metaDocType]
        );

        const metaDoc = getMetaDoc(
          { kind: 'story', projectId: state.selectedProjectId!, storyId: state.selectedStoryId! },
          state.metaDocType
        );

        // Also load story to get title
        const response = await alineaClient.loadStory(state.selectedProjectId!, state.selectedStoryId!);

        if (response.ok) {
          const hasContent = !!(metaDoc?.markdown && metaDoc.markdown.trim().length > 0);

          if (metaDoc?.markdown) {
            setState((s) => ({
              ...s,
              loadedTitle: `${response.data.title} - ${state.metaDocType}`,
              loadedFullText: metaDoc.markdown,
            }));
          }

          // Update main doc status AND the corresponding context status to keep them in sync
          setDocStatus((s) => ({
            ...s,
            mainDocHasContent: hasContent,
            // Also update the context status for this metaDoc
            ...(state.metaDocType === 'brief' && { briefHasContent: hasContent }),
            ...(state.metaDocType === 'outline' && { outlineHasContent: hasContent }),
            ...(state.metaDocType === 'world' && { worldHasContent: hasContent }),
          }));
        }
      }
    };

    loadContent();
  }, [state.selectedProjectId, state.selectedStoryId, state.metaDocType, state.contextType]);

  // Check document content status when story is selected
  useEffect(() => {
    if (!state.selectedProjectId || !state.selectedStoryId || state.contextType !== 'story') {
      setDocStatus({
        manifestHasContent: false,
        briefHasContent: false,
        outlineHasContent: false,
        worldHasContent: false,
        mainDocHasContent: false,
      });
      return;
    }

    const checkDocStatus = async () => {
      const ensureMetaDocsLoaded = useAppStore.getState().ensureMetaDocsLoaded;
      const getMetaDoc = useAppStore.getState().getMetaDoc;

      // Load manifest
      await ensureMetaDocsLoaded({ kind: 'root' }, ['manifest']);
      const manifestDoc = getMetaDoc({ kind: 'root' }, 'manifest');

      // Load story metaDocs
      await ensureMetaDocsLoaded(
        { kind: 'story', projectId: state.selectedProjectId!, storyId: state.selectedStoryId! },
        ['brief', 'outline', 'world']
      );

      const briefDoc = getMetaDoc(
        { kind: 'story', projectId: state.selectedProjectId!, storyId: state.selectedStoryId! },
        'brief'
      );

      const outlineDoc = getMetaDoc(
        { kind: 'story', projectId: state.selectedProjectId!, storyId: state.selectedStoryId! },
        'outline'
      );

      const worldDoc = getMetaDoc(
        { kind: 'story', projectId: state.selectedProjectId!, storyId: state.selectedStoryId! },
        'world'
      );

      setDocStatus((prevStatus) => ({
        ...prevStatus,
        manifestHasContent: !!(manifestDoc?.markdown && manifestDoc.markdown.trim().length > 0),
        briefHasContent: !!(briefDoc?.markdown && briefDoc.markdown.trim().length > 0),
        outlineHasContent: !!(outlineDoc?.markdown && outlineDoc.markdown.trim().length > 0),
        worldHasContent: !!(worldDoc?.markdown && worldDoc.markdown.trim().length > 0),
      }));
    };

    checkDocStatus();
  }, [state.selectedProjectId, state.selectedStoryId, state.contextType]);

  // Load manifest when contextType is 'manifest'
  useEffect(() => {
    if (state.contextType !== 'manifest') return;

    const loadManifest = async () => {
      const ensureMetaDocsLoaded = useAppStore.getState().ensureMetaDocsLoaded;
      const getMetaDoc = useAppStore.getState().getMetaDoc;

      await ensureMetaDocsLoaded({ kind: 'root' }, ['manifest']);

      const manifestDoc = getMetaDoc({ kind: 'root' }, 'manifest');

      if (manifestDoc?.markdown) {
        setState((s) => ({
          ...s,
          loadedTitle: 'Author Manifest',
          loadedFullText: manifestDoc.markdown,
        }));
        // Update main doc status
        setDocStatus((s) => ({
          ...s,
          mainDocHasContent: !!(manifestDoc.markdown && manifestDoc.markdown.trim().length > 0),
        }));
      }
    };

    loadManifest();
  }, [state.contextType]);

  // Build prompt when button clicked
  const handleBuildPrompt = useCallback(async () => {
    const fullText = state.emptyMainDoc ? '' : state.loadedFullText;
    const selection = state.scope === 'selection' ? state.loadedSelection : '';

    // Apply simulate empty overrides by temporarily modifying the Zustand store
    const getMetaDoc = useAppStore.getState().getMetaDoc;
    const originalMetaDocs = { ...useAppStore.getState().metaDocs };

    try {
      // Get the actual documents
      const manifestDoc = getMetaDoc({ kind: 'root' }, 'manifest');
      const briefDoc = state.selectedProjectId && state.selectedStoryId
        ? getMetaDoc({ kind: 'story', projectId: state.selectedProjectId, storyId: state.selectedStoryId }, 'brief')
        : null;
      const outlineDoc = state.selectedProjectId && state.selectedStoryId
        ? getMetaDoc({ kind: 'story', projectId: state.selectedProjectId, storyId: state.selectedStoryId }, 'outline')
        : null;
      const worldDoc = state.selectedProjectId && state.selectedStoryId
        ? getMetaDoc({ kind: 'world', projectId: state.selectedProjectId, storyId: state.selectedStoryId }, 'world')
        : null;

      // Apply overrides to the store temporarily
      if (state.simulateEmptyManifest && manifestDoc) {
        const manifestId = `root::manifest`;
        useAppStore.setState((s) => ({
          metaDocs: {
            ...s.metaDocs,
            [manifestId]: { ...manifestDoc, markdown: '' },
          },
        }));
      }

      if (state.simulateEmptyBrief && briefDoc) {
        const briefId = `story:project-${state.selectedProjectId}:story-${state.selectedStoryId}::brief`;
        useAppStore.setState((s) => ({
          metaDocs: {
            ...s.metaDocs,
            [briefId]: { ...briefDoc, markdown: '' },
          },
        }));
      }

      if (state.simulateEmptyWorld && worldDoc) {
        const worldId = `story:project-${state.selectedProjectId}:story-${state.selectedStoryId}::world`;
        useAppStore.setState((s) => ({
          metaDocs: {
            ...s.metaDocs,
            [worldId]: { ...worldDoc, markdown: '' },
          },
        }));
      }

      if (state.simulateEmptyOutline && outlineDoc) {
        const outlineId = `story:project-${state.selectedProjectId}:story-${state.selectedStoryId}::outline`;
        useAppStore.setState((s) => ({
          metaDocs: {
            ...s.metaDocs,
            [outlineId]: { ...outlineDoc, markdown: '' },
          },
        }));
      }

      // Get API key for intelligent context selection
      const apiKeyResponse = await window.settings.getApiKey();
      const apiKey = apiKeyResponse.ok && apiKeyResponse.data ? apiKeyResponse.data : undefined;

      // Build the prompt with overrides applied (now async)
      const prompt = await buildPrompt({
        rawUserPrompt: state.userPrompt,
        kind: state.contextType === 'manifest' ? 'manifest' : state.metaDocType,
        title: state.loadedTitle,
        scope: state.scope,
        fullTextMarkdown: fullText,
        selectionMarkdown: selection,
        projectId: state.selectedProjectId || undefined,
        storyId: state.selectedStoryId || undefined,
        useIntelligentContext: true,
        apiKey,
        language: 'sv',
      });

      setBuiltPrompt(prompt);
    } finally {
      // Restore original state
      useAppStore.setState({ metaDocs: originalMetaDocs });
    }
  }, [state]);

  return (
    <Box p="md" h="100vh" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Stack gap="sm" mb="sm">
        <Title order={3}>Playground</Title>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as PlaygroundMode)}
          data={[
            { label: 'Prompt Builder', value: 'prompt-builder' },
            { label: 'Context Determinator', value: 'context-determinator' },
            { label: 'Initial Hints', value: 'initial-hints-test' },
            { label: 'Wizard Tester', value: 'wizard-tester' },
          ]}
        />
      </Stack>

      {mode === 'wizard-tester' ? (
        <WizardTesterView />
      ) : mode === 'initial-hints-test' ? (
        <InitialHintsTest />
      ) : mode === 'context-determinator' ? (
        <ContextDeterminatorTest />
      ) : (
      <Group gap="md" style={{ flex: 1, minHeight: 0 }} grow align="flex-start">
        <Stack gap="lg" p="sm" style={{ minHeight: 0, height: "100%", flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)' }}>
          {/* Context Selection */}
          <Paper p="md">
            <Title order={4} mb="sm">Context Source</Title>
            <Stack gap="md">
              <SegmentedControl
                value={state.contextType}
                onChange={(value) => setState((s) => ({ ...s, contextType: value as ContextType }))}
                data={[
                  { label: 'Story', value: 'story' },
                  { label: 'Manifest', value: 'manifest' },
                ]}
              />

              {state.contextType === 'story' && (
                <>
                  <Select
                    label="Project"
                    placeholder="Select a project"
                    data={projects.map((p) => ({ value: p.id, label: p.name }))}
                    value={state.selectedProjectId}
                    onChange={(value) => setState((s) => ({ ...s, selectedProjectId: value, selectedStoryId: null }))}
                    clearable
                  />

                  {state.selectedProjectId && (
                    <Select
                      label="Story"
                      placeholder="Select a story"
                      data={stories.map((s) => ({ value: s.id, label: s.title }))}
                      value={state.selectedStoryId}
                      onChange={(value) => setState((s) => ({ ...s, selectedStoryId: value }))}
                      clearable
                    />
                  )}

                  {state.selectedStoryId && (
                    <SegmentedControl
                      value={state.metaDocType}
                      onChange={(value) => setState((s) => ({ ...s, metaDocType: value as EditorKind }))}
                      data={[
                        { label: 'Prose', value: 'prose' },
                        { label: 'Brief', value: 'brief' },
                        { label: 'World', value: 'world' },
                        { label: 'Outline', value: 'outline' },
                      ]}
                    />
                  )}
                </>
              )}
            </Stack>
          </Paper>

          {/* Only show configuration sections when ready */}
          {(state.contextType === 'manifest' || (state.contextType === 'story' && state.selectedStoryId)) && (
            <>
              {/* Main Document Status */}
              <Paper p="md">
                <Stack gap="md">
                  {docStatus.mainDocHasContent ? (
                    <>
                      <Group justify="space-between" align="center">
                        <Group gap="xs">
                          <Check size={16} color="var(--mantine-color-green-6)" />
                          <Text size="sm" fw={500}>
                            Main document has content ({state.contextType === 'manifest' ? 'manifest' : state.metaDocType})
                          </Text>
                        </Group>
                        <Switch
                          label="Simulate empty"
                          checked={state.emptyMainDoc}
                          onChange={(e) => setState((s) => ({ ...s, emptyMainDoc: e.currentTarget.checked }))}
                          size="xs"
                        />
                      </Group>
                      {/* Scope Selector - only show if main document has content */}
                      {!state.emptyMainDoc && (
                        <Box>
                          <SegmentedControl
                            value={state.scope}
                            onChange={(value) => setState((s) => ({ ...s, scope: value as QuestionScope }))}
                            data={[
                              { label: 'Full Text', value: 'text' },
                              { label: 'Selection', value: 'selection' },
                            ]}
                          />

                          {state.scope === 'selection' && (
                            <Textarea
                              label="Selection Text"
                              placeholder="Paste text that represents the selection..."
                              value={state.loadedSelection}
                              onChange={(e) => setState((s) => ({ ...s, loadedSelection: e.currentTarget.value }))}
                              minRows={4}
                              mt="md"
                            />
                          )}
                        </Box>
                      )}
                    </>
                  ) : (
                    <Group gap="xs">
                      <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                      <Text size="sm" fw={500}>
                        Main document is missing ({state.contextType === 'manifest' ? 'manifest' : state.metaDocType})
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Paper>

              {/* Combined Document Status */}
              <Paper p="md">
                <Stack gap="md">
                  {/* Contexts - only show for story context */}
                  {state.contextType === 'story' && (
                    <>
                      {/* Manifest - always show as context */}
                      {docStatus.manifestHasContent ? (
                        <Group justify="space-between" align="center">
                          <Group gap="xs">
                            <Check size={16} color="var(--mantine-color-green-6)" />
                            <Text size="sm" fw={500}>Manifest has content (used for context)</Text>
                          </Group>
                          <Switch
                            label="Simulate empty"
                            checked={state.simulateEmptyManifest}
                            onChange={(e) => setState((s) => ({ ...s, simulateEmptyManifest: e.currentTarget.checked }))}
                            size="xs"
                          />
                        </Group>
                      ) : (
                        <Group gap="xs">
                          <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                          <Text size="sm" fw={500}>Manifest is missing (used for context)</Text>
                        </Group>
                      )}

                      {/* World */}
                      {['outline', 'prose'].includes(state.metaDocType) && (
                        <>
                          <Divider />
                          {docStatus.worldHasContent ? (
                            <Group justify="space-between" align="center">
                              <Group gap="xs">
                                <Check size={16} color="var(--mantine-color-green-6)" />
                                <Text size="sm" fw={500}>World has content (used for context)</Text>
                              </Group>
                              <Switch
                                label="Simulate empty"
                                checked={state.simulateEmptyWorld}
                                onChange={(e) => setState((s) => ({ ...s, simulateEmptyWorld: e.currentTarget.checked }))}
                                size="xs"
                              />
                            </Group>
                          ) : (
                            <Group gap="xs">
                              <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                              <Text size="sm" fw={500}>World is missing (used for context)</Text>
                            </Group>
                          )}
                        </>
                      )}

                      {/* Brief */}
                      {['outline', 'world', 'prose'].includes(state.metaDocType) && (
                        <>
                          <Divider />
                          {docStatus.briefHasContent ? (
                            <Group justify="space-between" align="center">
                              <Group gap="xs">
                                <Check size={16} color="var(--mantine-color-green-6)" />
                                <Text size="sm" fw={500}>Brief has content (used for context)</Text>
                              </Group>
                              <Switch
                                label="Simulate empty"
                                checked={state.simulateEmptyBrief}
                                onChange={(e) => setState((s) => ({ ...s, simulateEmptyBrief: e.currentTarget.checked }))}
                                size="xs"
                              />
                            </Group>
                          ) : (
                            <Group gap="xs">
                              <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                              <Text size="sm" fw={500}>Brief is missing (used for context)</Text>
                            </Group>
                          )}
                        </>
                      )}

                      {/* Outline */}
                      {['prose'].includes(state.metaDocType) && (
                        <>
                          <Divider />
                          {docStatus.outlineHasContent ? (
                            <Group justify="space-between" align="center">
                              <Group gap="xs">
                                <Check size={16} color="var(--mantine-color-green-6)" />
                                <Text size="sm" fw={500}>Outline has content (used for context)</Text>
                              </Group>
                              <Switch
                                label="Simulate empty"
                                checked={state.simulateEmptyOutline}
                                onChange={(e) => setState((s) => ({ ...s, simulateEmptyOutline: e.currentTarget.checked }))}
                                size="xs"
                              />
                            </Group>
                          ) : (
                            <Group gap="xs">
                              <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                              <Text size="sm" fw={500}>Outline is missing (used for context)</Text>
                            </Group>
                          )}
                        </>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>

              {/* User Prompt */}
              <Textarea
                label="User Prompt"
                placeholder="Enter your question or instruction..."
                value={state.userPrompt}
                onChange={(e) => setState((s) => ({ ...s, userPrompt: e.currentTarget.value }))}
                minRows={3}
              />

              <Button onClick={handleBuildPrompt}>Build Prompt</Button>
            </>
          )}
        </Stack>

        {/* Right Column - Output */}
        <Box p="sm" style={{ minHeight: 0, height: "100%", flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--overlay)' }}>
          {builtPrompt ? (
            <PlaygroundOutput
              systemPrompt={builtPrompt.system}
              assistantPrompt={builtPrompt.assistant}
              userPrompt={builtPrompt.user}
              includedContexts={builtPrompt.includedContexts}
            />
          ) : (
            <Paper p="md" style={{ flex: 1, height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text c="dimmed" size="sm">
                Configure settings and click "Build Prompt" to see the output
              </Text>
            </Paper>
          )}
        </Box>
      </Group>
      )}
    </Box>
  );
};
