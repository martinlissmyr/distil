// src/state/useAppStore.ts
import { create } from 'zustand';
import { alineaClient } from '../api/alineaClient';
import { metaJsonToMarkdown } from './markdownUtils';
import type { MetaScope, MetaDocKey, MetaDocState } from '../types/metaDoc';
import type { WizardState, WizardActions, WizardContext, LlmProcessingStep } from '../wizards/types';
import { loadWizardConfig } from '../wizards/validation';
import {
  getCurrentStep,
  getNextStepPath,
  getPreviousStepPath,
  isStepComplete,
} from '../wizards/navigation';
import { buildInterpolationContext, interpolatePromptTemplate, interpolatePrompt } from '../wizards/promptInterpolator';

type ApiState = { hasApiKey: boolean | null };

type AppStore = {
  api: ApiState;
  metaDocs: Record<string, MetaDocState>; // id -> state
  wizardResult: string | null; // Result from completed wizard

  setHasApiKey: (v: boolean) => void;

  getMetaDoc: (scope: MetaScope, key: MetaDocKey) => MetaDocState | undefined;

  ensureMetaDocsLoaded: (
    scope: MetaScope,
    keys: MetaDocKey[]
  ) => Promise<void>;

  updateMetaDoc: (
    scope: MetaScope,
    key: MetaDocKey,
    json: any
  ) => void;

  saveMetaDoc: (scope: MetaScope, key: MetaDocKey) => Promise<void>;
} & WizardState & WizardActions;

// helper to get a unique id
export const metaId = (scope: MetaScope, key: MetaDocKey) => {
  if (scope.kind === 'root') return `root::${key}`;
  if (scope.kind === 'project') return `project:${scope.projectId}::${key}`;
  return `story:${scope.projectId}:${scope.storyId}::${key}`;
};

export const useAppStore = create<AppStore>((set, get) => ({
  api: { hasApiKey: null },

  metaDocs: {},

  wizardResult: null,

  // Wizard state
  activeWizard: null,
  wizardContext: null,

  setHasApiKey: (hasApiKey) => set({ api: { hasApiKey } }),

  getMetaDoc(scope, key) {
    return get().metaDocs[metaId(scope, key)];
  },

  async ensureMetaDocsLoaded(scope, keys) {
    const promises = keys.map(async (key) => {
      const id = metaId(scope, key);
      const existing = get().metaDocs[id];
      if (existing && (existing.json || existing.isLoading)) return;

      // optimistic
      set((state) => ({
        metaDocs: {
          ...state.metaDocs,
          [id]: {
            scope,
            key,
            json: existing?.json ?? null,
            markdown: existing?.markdown ?? null,
            isLoading: true,
            error: null,
          },
        },
      }));

      try {
        let json: any | null = null;

        if (scope.kind === 'root') {
          const response = await alineaClient.loadRootMetaDoc(key);
          if (response.ok) {
            json = response.data;
          } else {
            throw new Error(response.error);
          }
        } else if (scope.kind === 'project') {
          // Project-level metaDocs not implemented yet — no-op for now
          console.warn(
            '[useAppStore] Project metaDocs not implemented yet:',
            scope.projectId,
            key
          );
          json = null;
        } else {
          // story-level metaDocs (brief, outline, etc)
          const response = await alineaClient.loadStoryMetaDoc(
            scope.projectId,
            scope.storyId,
            key
          );
          if (response.ok) {
            json = response.data;
          } else {
            throw new Error(response.error);
          }
        }

        const markdown = json ? metaJsonToMarkdown(json) : '';

        set((state) => ({
          metaDocs: {
            ...state.metaDocs,
            [id]: {
              scope,
              key,
              json,
              markdown,
              isLoading: false,
              error: null,
            },
          },
        }));
      } catch (err: unknown) {
        console.error('ensureMetaDocsLoaded error', err);
        set((state) => ({
          metaDocs: {
            ...state.metaDocs,
            [id]: {
              scope,
              key,
              json: null,
              markdown: null,
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to load meta doc',
            },
          },
        }));
      }
    });

    await Promise.all(promises);
  },

  updateMetaDoc(scope, key, json) {
    const id = metaId(scope, key);
    const markdown = metaJsonToMarkdown(json);
    set((state) => ({
      metaDocs: {
        ...state.metaDocs,
        [id]: {
          scope,
          key,
          json,
          markdown,
          isLoading: false,
          error: null,
        },
      },
    }));
  },

  async saveMetaDoc(scope, key) {
    const id = metaId(scope, key);
    const docState = get().metaDocs[id];
    if (!docState?.json) return;

    if (scope.kind === 'root') {
      const response = await alineaClient.saveRootMetaDoc(key, docState.json);
      if (!response.ok) {
        console.error('[useAppStore] saveRootMetaDoc failed:', response.error);
        throw new Error(response.error);
      }
    } else if (scope.kind === 'project') {
      // placeholder for future project-level metaDocs
      console.warn(
        '[useAppStore] saveMetaDoc: project metaDocs not implemented yet:',
        scope.projectId,
        key
      );
    } else {
      const response = await alineaClient.saveStoryMetaDoc(
        scope.projectId,
        scope.storyId,
        key,
        docState.json
      );
      if (!response.ok) {
        console.error('[useAppStore] saveStoryMetaDoc failed:', response.error);
        throw new Error(response.error);
      }
    }
  },

  // Wizard actions
  async startWizard(wizardId: string, context: WizardContext) {
    try {
      const config = loadWizardConfig(wizardId);

      set({
        activeWizard: {
          id: wizardId,
          title: config.title,
          config,
          currentStepPath: [0],
          answers: {},
          completedSteps: new Set(),
          llmResults: {},
          isLlmProcessing: false,
          startedAt: Date.now(),
          hasUnsavedProgress: false,
        },
        wizardContext: context,
        wizardResult: null, // Clear any previous result
      });
    } catch (error) {
      console.error('[useAppStore] startWizard failed:', error);
      alert(`Failed to start wizard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  closeWizard(force = false) {
    const { activeWizard } = get();

    if (!activeWizard) return true;

    // Warn if unsaved progress
    if (!force && activeWizard.hasUnsavedProgress) {
      const confirmed = confirm(
        'You have unsaved progress in this wizard. Are you sure you want to close it?'
      );
      if (!confirmed) return false;
    }

    set({
      activeWizard: null,
      wizardContext: null,
    });

    return true;
  },

  goToStep(stepPath: number[]) {
    const { activeWizard } = get();
    if (!activeWizard) return;

    const step = getCurrentStep(activeWizard.config, stepPath);
    if (!step) {
      console.error('[useAppStore] goToStep: invalid step path', stepPath);
      return;
    }

    set({
      activeWizard: {
        ...activeWizard,
        currentStepPath: stepPath,
      },
    });
  },

  async nextStep() {
    const { activeWizard } = get();
    if (!activeWizard) return;

    const currentStep = getCurrentStep(
      activeWizard.config,
      activeWizard.currentStepPath
    );

    if (!currentStep) return;

    // Validate current step is complete
    if (!isStepComplete(currentStep, activeWizard.answers)) {
      alert('Please complete all required fields before continuing.');
      return;
    }

    // Mark current step as completed
    const newCompletedSteps = new Set(activeWizard.completedSteps);
    newCompletedSteps.add(currentStep.id);

    // Get next step path
    const nextPath = getNextStepPath(
      activeWizard.config,
      activeWizard.currentStepPath,
      activeWizard.answers
    );

    if (!nextPath) {
      // Reached the end - wizard is complete
      console.log('[useAppStore] Wizard complete!');

      // Bake the wizard results into text and insert into editor
      const bakedText = await get().bakeWizard();
      await get().insertResult(bakedText);

      // Close the wizard
      get().closeWizard(true);
      return;
    }

    set({
      activeWizard: {
        ...activeWizard,
        currentStepPath: nextPath,
        completedSteps: newCompletedSteps,
        hasUnsavedProgress: true,
      },
    });

    // Handle LLM processing steps
    const nextStep = getCurrentStep(activeWizard.config, nextPath);
    if (nextStep?.type === 'llm-processing') {
      await get().processLlmStep(nextStep as LlmProcessingStep);
    }
  },

  previousStep() {
    const { activeWizard } = get();
    if (!activeWizard) return;

    const prevPath = getPreviousStepPath(
      activeWizard.config,
      activeWizard.currentStepPath
    );

    if (!prevPath) {
      // Can't go back further
      return;
    }

    set({
      activeWizard: {
        ...activeWizard,
        currentStepPath: prevPath,
      },
    });
  },

  setAnswer(stepId: string, value: any) {
    const { activeWizard } = get();
    if (!activeWizard) return;

    set({
      activeWizard: {
        ...activeWizard,
        answers: {
          ...activeWizard.answers,
          [stepId]: value,
        },
        hasUnsavedProgress: true,
      },
    });
  },

  getAnswer(stepId: string) {
    const { activeWizard } = get();
    return activeWizard?.answers[stepId];
  },

  async processLlmStep(step: LlmProcessingStep) {
    console.log('[processLlmStep] Starting LLM processing for step:', step.id, 'resultKey:', step.resultKey);

    const { activeWizard, wizardContext } = get();
    if (!activeWizard || !wizardContext) {
      console.error('[processLlmStep] No active wizard');
      return;
    }

    // MOCK MODE: For testing without consuming API tokens
    const MOCK_MODE = true; // Set to false to use real API calls

    if (MOCK_MODE) {
      console.log('[processLlmStep] MOCK MODE enabled - using fake response');

      // Set processing state briefly to show loading UI
      set({
        activeWizard: {
          ...activeWizard,
          isLlmProcessing: true,
          error: undefined,
        },
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate mock response based on resultKey
      const mockResponses: Record<string, string> = {
        'writing_tip': 'Show, don\'t tell—let readers experience emotions through actions and sensory details rather than simply stating how characters feel.',
        'project_summary': 'This exciting [genre] project explores [themes] with a focus on [key elements]. The author brings [experience level] of experience and is particularly interested in developing strong [selected challenges].',
        'default': 'This is a mock AI-generated response for testing purposes. In production, this would be replaced with actual GPT output.',
      };

      const mockResult = mockResponses[step.resultKey] || mockResponses['default'];
      console.log('[processLlmStep] Mock result:', mockResult);

      // Store the mock result
      const newActiveWizard = get().activeWizard;
      if (!newActiveWizard) {
        console.error('[processLlmStep] No active wizard after mock delay');
        return;
      }

      set({
        activeWizard: {
          ...newActiveWizard,
          llmResults: {
            ...newActiveWizard.llmResults,
            [step.resultKey]: mockResult,
          },
          isLlmProcessing: false,
          hasUnsavedProgress: true,
        },
      });

      console.log('[processLlmStep] Mock result stored. Current llmResults:', get().activeWizard?.llmResults);

      // If step is hidden, automatically advance to next step
      if (step.hidden) {
        console.log('[processLlmStep] Step is hidden, auto-advancing...');
        await get().nextStep();
      } else {
        console.log('[processLlmStep] Step is not hidden, waiting for user to click Next');
      }

      return;
    }

    // Set processing state
    set({
      activeWizard: {
        ...activeWizard,
        isLlmProcessing: true,
        error: undefined,
      },
    });

    console.log('[processLlmStep] Set isLlmProcessing to true');

    try {
      // Build interpolation context from wizard state
      const metaDocsMarkdown: Record<MetaDocKey, string | null> = {};

      // Load manifest (always available)
      const manifestId = metaId({ kind: 'root' }, 'manifest');
      metaDocsMarkdown.manifest = get().metaDocs[manifestId]?.markdown ?? null;

      // Load story metaDocs if in story scope
      if (wizardContext.targetScope.kind === 'story') {
        const { projectId, storyId } = wizardContext.targetScope;
        const briefId = metaId({ kind: 'story', projectId, storyId }, 'brief');
        const outlineId = metaId({ kind: 'story', projectId, storyId }, 'outline');

        metaDocsMarkdown.brief = get().metaDocs[briefId]?.markdown ?? null;
        metaDocsMarkdown.outline = get().metaDocs[outlineId]?.markdown ?? null;
      }

      const context = buildInterpolationContext(activeWizard, metaDocsMarkdown);

      // Interpolate prompt template
      const interpolated = interpolatePromptTemplate(step.prompt, context);

      // Build messages for chat API
      const messages: Array<{ role: string; content: string }> = [];

      if (interpolated.system) {
        messages.push({ role: 'system', content: interpolated.system });
      }

      messages.push({ role: 'user', content: interpolated.user });

      // Call chat API
      console.log('[processLlmStep] Calling chat API with messages:', messages);
      const response = await window.chat.send({ messages });
      console.log('[processLlmStep] Full API response:', response);

      // The response is wrapped in IPC format: { ok: true, data: { output_text: "..." } }
      if (!response.ok) {
        throw new Error('Chat API returned error');
      }

      let result: any = response.data.output_text;
      console.log('[processLlmStep] Extracted output_text:', result);

      // Extract JSON if requested
      if (step.extractJson) {
        try {
          // Try to extract JSON from markdown code blocks first
          const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[1]);
          } else {
            // Try to parse the entire response as JSON
            result = JSON.parse(result);
          }
        } catch (err) {
          console.error('[processLlmStep] Failed to parse JSON:', err);
          throw new Error(`Failed to extract JSON from LLM response: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Store result in llmResults
      const newActiveWizard = get().activeWizard;
      if (!newActiveWizard) {
        console.error('[processLlmStep] No active wizard after API call');
        return;
      }

      console.log('[processLlmStep] Storing result for key:', step.resultKey, 'value:', result);

      set({
        activeWizard: {
          ...newActiveWizard,
          llmResults: {
            ...newActiveWizard.llmResults,
            [step.resultKey]: result,
          },
          isLlmProcessing: false,
          hasUnsavedProgress: true,
        },
      });

      console.log('[processLlmStep] Result stored. Current llmResults:', get().activeWizard?.llmResults);

      // If step is hidden, automatically advance to next step
      if (step.hidden) {
        console.log('[processLlmStep] Step is hidden, auto-advancing...');
        await get().nextStep();
      } else {
        console.log('[processLlmStep] Step is not hidden, waiting for user to click Next');
      }
    } catch (error) {
      console.error('[processLlmStep] Error:', error);
      const currentWizard = get().activeWizard;
      if (currentWizard) {
        set({
          activeWizard: {
            ...currentWizard,
            isLlmProcessing: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }

      // TODO: Handle retry logic based on step.retryOnError
    }
  },

  clearLlmResult(resultKey: string) {
    const { activeWizard } = get();
    if (!activeWizard) return;

    console.log('[clearLlmResult] Clearing result for key:', resultKey);

    // Create a copy of llmResults without the specified key
    const newLlmResults = { ...activeWizard.llmResults };
    delete newLlmResults[resultKey];

    set({
      activeWizard: {
        ...activeWizard,
        llmResults: newLlmResults,
      },
    });

    console.log('[clearLlmResult] Result cleared. Current llmResults:', get().activeWizard?.llmResults);
  },

  async bakeWizard() {
    const { activeWizard } = get();
    if (!activeWizard) return '';

    console.log('[bakeWizard] Formatting wizard results...');

    // If outputTemplate is defined, use it with interpolation
    if (activeWizard.config.outputTemplate) {
      console.log('[bakeWizard] Using outputTemplate');

      // Build interpolation context (without metaDocs for now)
      const context = {
        answers: activeWizard.answers,
        llmResults: activeWizard.llmResults,
        metaDocs: {}, // Could be enhanced to load metaDocs if needed
      };

      const result = interpolatePrompt(activeWizard.config.outputTemplate, context);
      console.log('[bakeWizard] Generated output from template:', result);
      return result;
    }

    // Otherwise, use default formatting (include all answers and LLM results)
    console.log('[bakeWizard] Using default formatting');
    const lines: string[] = [];

    // Add title
    lines.push(`# ${activeWizard.config.title}`);
    lines.push('');

    // Add all answers with step titles
    for (const step of activeWizard.config.steps) {
      if (step.type === 'question') {
        const answer = activeWizard.answers[step.id];
        if (answer !== undefined && answer !== null && answer !== '') {
          lines.push(`## ${step.title}`);

          if (Array.isArray(answer)) {
            // Multi-select answers
            answer.forEach(val => lines.push(`- ${val}`));
          } else {
            // Single value answers
            lines.push(String(answer));
          }

          lines.push('');
        }
      }
    }

    // Add all LLM results
    if (Object.keys(activeWizard.llmResults).length > 0) {
      lines.push('---');
      lines.push('');

      for (const [key, value] of Object.entries(activeWizard.llmResults)) {
        // Find the step that generated this result to get its title
        const llmStep = activeWizard.config.steps.find(
          s => (s.type === 'llm-processing' && s.resultKey === key)
        );

        if (llmStep) {
          lines.push(`## ${llmStep.title}`);
        }

        lines.push(String(value));
        lines.push('');
      }
    }

    const result = lines.join('\n');
    console.log('[bakeWizard] Generated output:', result);
    return result;
  },

  async insertResult(text: string) {
    console.log('[insertResult] Inserting wizard result:', text);

    const { wizardContext } = get();
    if (!wizardContext) {
      console.error('[insertResult] No wizard context');
      return;
    }

    // Get the editor instance from context
    const editor = wizardContext.targetEditor;
    if (!editor) {
      console.warn('[insertResult] No editor instance in context, falling back to state storage');
      set({ wizardResult: text });
      return;
    }

    // Insert the markdown text into the editor
    try {
      // Get current content as markdown
      const currentContent = editor.getMarkdown();

      // Append wizard result (with spacing if there's existing content)
      const newContent = currentContent.trim()
        ? `${currentContent}\n\n${text}`
        : text;

      // Parse markdown to JSON using the editor's markdown extension
      // The markdown extension adds a `parse` method that converts markdown to JSON
      const jsonContent = editor.markdown.parse(newContent);

      // Set the parsed JSON content
      editor.commands.setContent(jsonContent);

      console.log('[insertResult] Successfully inserted into editor');
    } catch (error) {
      console.error('[insertResult] Failed to insert into editor:', error);
      // Fallback to state storage
      set({ wizardResult: text });
    }
  },
}));