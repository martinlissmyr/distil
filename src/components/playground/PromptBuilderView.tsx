// src/components/playground/PromptBuilderView.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Stack,
  Title,
  Select,
  Textarea,
  Button,
  Switch,
  Group,
  Paper,
  SegmentedControl,
  Text,
  Divider,
} from '@mantine/core';
import { Check, AlertTriangle } from 'lucide-react';

import { client, type Project, type StoryMeta } from '../../api/client';
import { buildPrompt, type BuiltPrompt } from '../../chat/buildPrompt';
import type { QuestionScope } from '../../types/chat';
import { useAppStore, metaId } from '../../state/useAppStore';
import { jsonToMarkdown } from '../../helpers/markdownUtils';
import { DEFAULT_WRITING_LANGUAGE } from '../../types/language';

import { PlaygroundOutput } from './PlaygroundOutput';

import type { DocKindId, MetaDocKey } from '../../models/docs';
import {
  docKinds,
  getDocScope,
  getDocTitle,
  getDocDescription,
  getContextRulesFor,
  isMetaDocKey,
} from '../../models/docs';

type DocStatusMap = Partial<Record<MetaDocKey, boolean>>;

type PromptBuilderState = {
  // Main target doc kind (comes from docs model)
  kind: DocKindId;

  // Story selection (only used when target scope is story)
  selectedProjectId: string | null;
  selectedStoryId: string | null;

  // Overrides
  emptyMainDoc: boolean;
  simulateEmptyContextDocs: Partial<Record<MetaDocKey, boolean>>;

  // Scope
  scope: QuestionScope;

  // User prompt
  userPrompt: string;

  // Loaded content
  loadedTitle: string;
  loadedFullText: string;
  loadedSelection: string;
};

export const PromptBuilderView: React.FC = () => {
  const [state, setState] = useState<PromptBuilderState>({
    kind: 'prose',
    selectedProjectId: null,
    selectedStoryId: null,

    emptyMainDoc: false,
    simulateEmptyContextDocs: {},

    scope: 'text',
    userPrompt: '{{What the user actually writes}}',

    loadedTitle: '',
    loadedFullText: '',
    loadedSelection: '',
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<StoryMeta[]>([]);
  const [builtPrompt, setBuiltPrompt] = useState<BuiltPrompt | null>(null);

  const [mainHasContent, setMainHasContent] = useState(false);
  const [contextStatus, setContextStatus] = useState<DocStatusMap>({});

  const targetScope = useMemo(() => getDocScope(state.kind), [state.kind]);
  const needsStory = targetScope === 'story';
  const needsRoot = targetScope === 'root';

  // Derive context docs from docs model (no hardcoding)
  const contextRules = useMemo(() => getContextRulesFor(state.kind), [state.kind]);
  const contextDocKeys = useMemo(() => {
    // These are meta doc keys by construction in getContextRulesFor
    return [...contextRules.alwaysInclude, ...contextRules.intelligentlySelect];
  }, [contextRules]);

  // Options for selecting doc kind (from docs model)
  const docKindOptions = useMemo(() => {
    const root: Array<{ value: string; label: string }> = [];
    const story: Array<{ value: string; label: string }> = [];
    const project: Array<{ value: string; label: string }> = [];

    for (const k of Object.keys(docKinds) as DocKindId[]) {
      const scope = getDocScope(k);
      const item = { value: k, label: getDocTitle(k) };

      if (scope === 'root') root.push(item);
      else if (scope === 'story') story.push(item);
      else project.push(item);
    }

    const groups: Array<{ group: string; items: Array<{ value: string; label: string }> }> = [];

    if (root.length) groups.push({ group: 'Root', items: root });
    if (story.length) groups.push({ group: 'Story', items: story });
    if (project.length) groups.push({ group: 'Project', items: project });

    return groups;
  }, []);

  // Load projects on mount
  useEffect(() => {
    client.listProjects().then((response) => {
      if (response.ok) setProjects(response.data);
    });
  }, []);

  // Load stories when project selected (only when needed)
  useEffect(() => {
    if (!needsStory) {
      setStories([]);
      return;
    }

    if (state.selectedProjectId) {
      client.listStories(state.selectedProjectId).then((response) => {
        if (response.ok) setStories(response.data);
      });
    } else {
      setStories([]);
    }
  }, [needsStory, state.selectedProjectId]);

  // Reset story selection when switching away from story docs
  useEffect(() => {
    if (!needsStory) {
      setState((s) => ({
        ...s,
        selectedProjectId: null,
        selectedStoryId: null,
      }));
    }
  }, [needsStory]);

  // Load main doc content when (kind + scope identifiers) change
  useEffect(() => {
    const loadMain = async () => {
      setBuiltPrompt(null);

      // Not ready yet for story-scoped docs
      if (needsStory && (!state.selectedProjectId || !state.selectedStoryId)) {
        setState((s) => ({ ...s, loadedTitle: '', loadedFullText: '' }));
        setMainHasContent(false);
        return;
      }

      // Root-scoped: meta doc only (manifest today, but we don't hardcode)
      if (needsRoot) {
        if (isMetaDocKey(state.kind)) {
          const ensureMetaDocsLoaded = useAppStore.getState().ensureMetaDocsLoaded;
          const getMetaDoc = useAppStore.getState().getMetaDoc;

          await ensureMetaDocsLoaded({ scope: 'root' }, [state.kind]);

          const doc = getMetaDoc({ scope: 'root' }, state.kind);
          const markdown = doc?.markdown ?? '';

          setState((s) => ({
            ...s,
            loadedTitle: getDocTitle(state.kind),
            loadedFullText: markdown,
          }));
          setMainHasContent(!!markdown.trim());
        } else {
          // If you ever add a root primary doc, handle it here.
          setState((s) => ({
            ...s,
            loadedTitle: getDocTitle(state.kind),
            loadedFullText: '',
          }));
          setMainHasContent(false);
        }
        return;
      }

      // Story-scoped main doc
      const projectId = state.selectedProjectId!;
      const storyId = state.selectedStoryId!;

      if (state.kind === 'prose') {
        const res = await client.loadStory(projectId, storyId);
        if (!res.ok) return;

        const markdown = jsonToMarkdown(res.data.doc, 'prose');

        setState((s) => ({
          ...s,
          loadedTitle: res.data.title,
          loadedFullText: markdown,
        }));
        setMainHasContent(!!markdown.trim());
        return;
      }

      // Story-scoped meta doc
      if (isMetaDocKey(state.kind)) {
        const ensureMetaDocsLoaded = useAppStore.getState().ensureMetaDocsLoaded;
        const getMetaDoc = useAppStore.getState().getMetaDoc;

        await ensureMetaDocsLoaded({ scope: 'story', projectId, storyId }, [state.kind]);

        const metaDoc = getMetaDoc({ scope: 'story', projectId, storyId }, state.kind);
        const markdown = metaDoc?.markdown ?? '';

        // Also load story title to present consistent title
        const storyRes = await client.loadStory(projectId, storyId);
        const storyTitle = storyRes.ok ? storyRes.data.title : '';

        setState((s) => ({
          ...s,
          loadedTitle: storyTitle ? `${storyTitle} - ${getDocTitle(state.kind)}` : getDocTitle(state.kind),
          loadedFullText: markdown,
        }));
        setMainHasContent(!!markdown.trim());
        return;
      }

      // If you add other story primary docs later
      setState((s) => ({ ...s, loadedTitle: getDocTitle(state.kind), loadedFullText: '' }));
      setMainHasContent(false);
    };

    loadMain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, needsStory, needsRoot, state.selectedProjectId, state.selectedStoryId]);

  // Load + compute context doc content status derived from docs model rules
  useEffect(() => {
    const loadContextStatus = async () => {
      // If story scope isn't ready yet, clear
      if (needsStory && (!state.selectedProjectId || !state.selectedStoryId)) {
        setContextStatus({});
        return;
      }

      const ensureMetaDocsLoaded = useAppStore.getState().ensureMetaDocsLoaded;
      const getMetaDoc = useAppStore.getState().getMetaDoc;

      const next: DocStatusMap = {};

      // Load root context docs
      const rootKeys = contextDocKeys.filter((k) => getDocScope(k) === 'root');
      if (rootKeys.length) {
        await ensureMetaDocsLoaded({ scope: 'root' }, rootKeys);
        for (const k of rootKeys) {
          const doc = getMetaDoc({ scope: 'root' }, k);
          next[k] = !!doc?.markdown?.trim();
        }
      }

      // Load story context docs
      const storyKeys = contextDocKeys.filter((k) => getDocScope(k) === 'story');
      if (storyKeys.length && needsStory) {
        const projectId = state.selectedProjectId!;
        const storyId = state.selectedStoryId!;
        await ensureMetaDocsLoaded({ scope: 'story', projectId, storyId }, storyKeys);
        for (const k of storyKeys) {
          const doc = getMetaDoc({ scope: 'story', projectId, storyId }, k);
          next[k] = !!doc?.markdown?.trim();
        }
      }

      setContextStatus(next);
    };

    loadContextStatus();
  }, [contextDocKeys, needsStory, state.selectedProjectId, state.selectedStoryId]);

  const handleBuildPrompt = useCallback(async () => {
    // Not ready if story doc requires story selection
    if (needsStory && (!state.selectedProjectId || !state.selectedStoryId)) return;

    const fullText = state.emptyMainDoc ? '' : state.loadedFullText;
    const selection = state.scope === 'selection' ? state.loadedSelection : '';

    const originalMetaDocs = { ...useAppStore.getState().metaDocs };

    try {
      // Apply context overrides by patching the store (no hard-coded IDs)
      const overrides = state.simulateEmptyContextDocs;
      const getMetaDoc = useAppStore.getState().getMetaDoc;

      for (const [key, enabled] of Object.entries(overrides) as Array<[MetaDocKey, boolean]>) {
        if (!enabled) continue;

        const scope = getDocScope(key);
        if (scope === 'root') {
          const doc = getMetaDoc({ scope: 'root' }, key);
          if (!doc) continue;
          const id = metaId({ scope: 'root' }, key);
          useAppStore.setState((s) => ({
            metaDocs: {
              ...s.metaDocs,
              [id]: { ...doc, markdown: '' },
            },
          }));
        }

        if (scope === 'story') {
          const projectId = state.selectedProjectId!;
          const storyId = state.selectedStoryId!;
          const doc = getMetaDoc({ scope: 'story', projectId, storyId }, key);
          if (!doc) continue;
          const id = metaId({ scope: 'story', projectId, storyId }, key);
          useAppStore.setState((s) => ({
            metaDocs: {
              ...s.metaDocs,
              [id]: { ...doc, markdown: '' },
            },
          }));
        }
      }

      const prompt = await buildPrompt({
        rawUserPrompt: state.userPrompt,
        kind: state.kind as any,
        title: state.loadedTitle || getDocTitle(state.kind),
        scope: state.scope,
        fullTextMarkdown: fullText,
        selectionMarkdown: selection,
        projectId: needsStory ? state.selectedProjectId || undefined : undefined,
        storyId: needsStory ? state.selectedStoryId || undefined : undefined,
        language: DEFAULT_WRITING_LANGUAGE,
      } as any);

      setBuiltPrompt(prompt);
    } finally {
      useAppStore.setState({ metaDocs: originalMetaDocs });
    }
  }, [needsStory, state]);

  const canConfigure = needsRoot || (needsStory && !!state.selectedStoryId);

  return (
    <Group gap="md" style={{ flex: 1, minHeight: 0 }} grow align="flex-start">
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
        {/* Target Selection */}
        <Paper p="md">
          <Title order={4} mb="sm">
            Target Document
          </Title>
          <Stack gap="md">
            <Select
              label="Doc kind"
              placeholder="Select a doc kind"
              data={docKindOptions}
              value={state.kind}
              onChange={(value) => {
                const kind = (value as DocKindId) || 'prose';
                setState((s) => ({
                  ...s,
                  kind,
                  // reset doc-related UI state
                  emptyMainDoc: false,
                  simulateEmptyContextDocs: {},
                  scope: 'text',
                  loadedTitle: '',
                  loadedFullText: '',
                  loadedSelection: '',
                }));
              }}
              searchable
              clearable={false}
            />

            {needsStory && (
              <>
                <Select
                  label="Project"
                  placeholder="Select a project"
                  data={projects.map((p) => ({ value: p.id, label: p.name }))}
                  value={state.selectedProjectId}
                  onChange={(value) =>
                    setState((s) => ({
                      ...s,
                      selectedProjectId: value,
                      selectedStoryId: null,
                    }))
                  }
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
              </>
            )}
          </Stack>
        </Paper>

        {/* Only show configuration sections when ready */}
        {canConfigure && (
          <>
            {/* Main Document Status */}
            <Paper p="md">
              <Stack gap="md">
                {mainHasContent ? (
                  <>
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <Check size={16} color="var(--mantine-color-green-6)" />
                        <Text size="sm" fw={500}>
                          Main document has content ({getDocTitle(state.kind)})
                        </Text>
                      </Group>
                      <Switch
                        label="Simulate empty"
                        checked={state.emptyMainDoc}
                        onChange={(e) => setState((s) => ({ ...s, emptyMainDoc: e.currentTarget.checked }))}
                        size="xs"
                      />
                    </Group>

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
                      Main document is missing ({getDocTitle(state.kind)})
                    </Text>
                  </Group>
                )}
              </Stack>
            </Paper>

            {/* Derived Context Status (from docs model rules) */}
            <Paper p="md">
              <Stack gap="md">
                <Title order={5}>Derived Context Docs</Title>

                {contextDocKeys.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No context docs for this target.
                  </Text>
                ) : (
                  contextDocKeys.map((k, idx) => {
                    const has = !!contextStatus[k];
                    const simulatedEmpty = !!state.simulateEmptyContextDocs[k];

                    return (
                      <React.Fragment key={k}>
                        {idx > 0 && <Divider />}

                        {has ? (
                          <Group justify="space-between" align="center">
                            <Group gap="xs">
                              <Check size={16} color="var(--mantine-color-green-6)" />
                              <Stack gap={0}>
                                <Text size="sm" fw={500}>
                                  {getDocTitle(k)}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {getDocDescription(k)}
                                </Text>
                              </Stack>
                            </Group>

                            <Switch
                              label="Simulate empty"
                              checked={simulatedEmpty}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...s,
                                  simulateEmptyContextDocs: {
                                    ...s.simulateEmptyContextDocs,
                                    [k]: e.currentTarget.checked,
                                  },
                                }))
                              }
                              size="xs"
                            />
                          </Group>
                        ) : (
                          <Group gap="xs" align="flex-start">
                            <AlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                            <Stack gap={0}>
                              <Text size="sm" fw={500}>
                                {getDocTitle(k)} is missing
                              </Text>
                              <Text size="xs" c="dimmed">
                                {getDocDescription(k)}
                              </Text>
                            </Stack>
                          </Group>
                        )}
                      </React.Fragment>
                    );
                  })
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

            <Button onClick={handleBuildPrompt} disabled={needsStory && !state.selectedStoryId}>
              Build Prompt
            </Button>
          </>
        )}
      </Stack>

      {/* Right Column - Output */}
      <Box
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
        {builtPrompt ? (
          <PlaygroundOutput
            systemPrompt={builtPrompt.system}
            assistantPrompt={builtPrompt.assistant}
            userPrompt={builtPrompt.user}
            includedContexts={builtPrompt.includedContexts}
          />
        ) : (
          <Paper
            p="md"
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text c="dimmed" size="sm">
              Configure settings and click "Build Prompt" to see the output
            </Text>
          </Paper>
        )}
      </Box>
    </Group>
  );
};