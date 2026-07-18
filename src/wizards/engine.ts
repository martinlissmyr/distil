// src/wizards/engine.ts
import type {
  WizardContext,
  LlmProcessingStep,
  WizardState,
  WizardValue,
} from './types';
import { getWizardConfig } from './registry';
import {
  getCurrentStep,
  getNextStepPath,
  getPreviousStepPath,
  isStepComplete,
} from './navigation';
import { useAppStore } from '../state/useAppStore';
import { buildPromptForStep } from './promptBuilder';
import { interpolate } from '../helpers/interpolate';

export type WizardDeps = {
  // Chat boundary
  sendChat: (args: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
  }) => Promise<{
    ok: boolean;
    data?: { output_text: string };
    error?: string;
  }>;

  // Editor boundary (optional)
  insertIntoEditor?: (ctx: WizardContext, text: string) => Promise<void>;

  // UI boundary (optional)
  alert?: (msg: string) => void;
  confirm?: (msg: string) => boolean;

  // Flags
  mockMode?: boolean;
  mockDelayMs?: number;
};

export function createWizardEngine(deps: WizardDeps) {
  // NOTE: do NOT use zustand hook inside here. Use getState().
  const getWritingLanguage = () => useAppStore.getState().writingLanguage;

  async function startWizard(
    wizardId: string,
    context: WizardContext,
  ): Promise<Pick<WizardState, 'activeWizard' | 'wizardContext'>> {
    const config = getWizardConfig(wizardId);

    return {
      activeWizard: {
        id: wizardId,
        title: config.title,
        config,
        currentStepPath: [0],
        answers: {},
        completedSteps: new Set(),
        llmResults: {},
        llmDrafts: {},
        isLlmProcessing: false,
        startedAt: Date.now(),
        hasUnsavedProgress: false,
      },
      wizardContext: context,
    };
  }

  function goToStep(state: WizardState, stepPath: number[]): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    const step = getCurrentStep(activeWizard.config, stepPath);
    if (!step) return state;

    return {
      ...state,
      activeWizard: { ...activeWizard, currentStepPath: stepPath },
    };
  }

  function previousStep(state: WizardState): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    const prev = getPreviousStepPath(
      activeWizard.config,
      activeWizard.currentStepPath
    );
    if (!prev) return state;

    return {
      ...state,
      activeWizard: { ...activeWizard, currentStepPath: prev },
    };
  }

  function setAnswer(state: WizardState, stepId: string, value: WizardValue): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    return {
      ...state,
      activeWizard: {
        ...activeWizard,
        answers: { ...activeWizard.answers, [stepId]: value },
        hasUnsavedProgress: true,
      },
    };
  }

  function setLlmDraft(state: WizardState, resultKey: string, value: string): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    return {
      ...state,
      activeWizard: {
        ...activeWizard,
        llmDrafts: { ...(activeWizard.llmDrafts ?? {}), [resultKey]: value },
        hasUnsavedProgress: true,
      },
    };
  }

  function setLlmResult(state: WizardState, resultKey: string, value: WizardValue): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    return {
      ...state,
      activeWizard: {
        ...activeWizard,
        llmResults: { ...activeWizard.llmResults, [resultKey]: value },
        hasUnsavedProgress: true,
      },
    };
  }

  function clearLlmResult(state: WizardState, resultKey: string): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    const nextResults = { ...activeWizard.llmResults };
    delete nextResults[resultKey];

    const nextDrafts = { ...(activeWizard.llmDrafts ?? {}) };
    delete nextDrafts[resultKey]; // also clear draft on regen

    return {
      ...state,
      activeWizard: {
        ...activeWizard,
        llmResults: nextResults,
        llmDrafts: nextDrafts,
      },
    };
  }

  async function processLlmStep(
    state: WizardState,
    step: LlmProcessingStep
  ): Promise<WizardState> {
    const { activeWizard, wizardContext } = state;
    if (!activeWizard || !wizardContext) return state;

    // mark processing
    state = {
      ...state,
      activeWizard: { ...activeWizard, isLlmProcessing: true, error: undefined },
    };

    try {
      // Use prompt builder
      const { messages, summary } = await buildPromptForStep(
        step,
        activeWizard.answers,
        activeWizard.llmResults,
        wizardContext,
        {
          getWritingLanguage,
        }
      );

      if (deps.mockMode) {
        // mock mode
        await new Promise((r) => setTimeout(r, deps.mockDelayMs ?? 800));

        const mock: Record<string, string> = {
          writing_tip: "Show, don't tell—use action and sensory detail.",
          default: summary,
        };
        const value = mock[step.resultKey] ?? mock.default;

        const w = state.activeWizard!;

        // Don't populate llmDrafts here - let LlmProcessingStepView seed it when displayed
        return {
          ...state,
          activeWizard: {
            ...w,
            llmResults: { ...w.llmResults, [step.resultKey]: value },
            isLlmProcessing: false,
            hasUnsavedProgress: true,
          },
        };
      }

      const res = await deps.sendChat({ messages });
      if (!res.ok || !res.data?.output_text)
        throw new Error(res.error || 'Chat error');

      let result: WizardValue = res.data.output_text;
      if (step.extractJson) {
        const m = result.match(/```json\n([\s\S]*?)\n```/);
        result = JSON.parse(m ? m[1] : result) as WizardValue;
      }

      const w = state.activeWizard!;

      // Don't populate llmDrafts here - let LlmProcessingStepView seed it when displayed
      return {
        ...state,
        activeWizard: {
          ...w,
          llmResults: { ...w.llmResults, [step.resultKey]: result },
          isLlmProcessing: false,
          hasUnsavedProgress: true,
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const w = state.activeWizard!;
      return {
        ...state,
        activeWizard: { ...w, isLlmProcessing: false, error: msg },
      };
    }
  }

  function bakeWizard(state: WizardState): string {
    const w = state.activeWizard;
    if (!w) return '';

    if (w.config.outputTemplate) {
      const vars = { ...w.answers, ...w.llmResults };
      return interpolate(w.config.outputTemplate, vars);
    }

    // default bake
    const lines: string[] = [`# ${w.config.title}`, ''];

    for (const step of w.config.steps) {
      if (step.type !== 'question') continue;
      const ans = w.answers[step.id];
      if (ans === undefined || ans === null || ans === '') continue;

      lines.push(`## ${step.title}`);
      if (Array.isArray(ans)) ans.forEach((v) => lines.push(`- ${v}`));
      else lines.push(String(ans));
      lines.push('');
    }

    if (Object.keys(w.llmResults).length) {
      lines.push('---', '');
      for (const [k, v] of Object.entries(w.llmResults)) {
        lines.push(`## ${k}`);
        lines.push(String(v), '');
      }
    }

    return lines.join('\n');
  }

  async function nextStep(state: WizardState): Promise<{
    state: WizardState;
    completed?: boolean;
    bakedText?: string;
  }> {
    const w = state.activeWizard;
    if (!w) return { state };

    const current = getCurrentStep(w.config, w.currentStepPath);
    if (!current) return { state };

    if (!isStepComplete(current, w.answers)) {
      deps.alert?.('Please complete all required fields before continuing.');
      return { state };
    }

    const completedSteps = new Set(w.completedSteps);
    completedSteps.add(current.id);

    const nextPath = getNextStepPath(w.config, w.currentStepPath, w.answers);
    if (!nextPath) {
      const bakedText = bakeWizard(state);
      if (deps.insertIntoEditor) {
        await deps.insertIntoEditor(state.wizardContext!, bakedText);
      }
      return { state, completed: true, bakedText };
    }

    state = {
      ...state,
      activeWizard: {
        ...w,
        currentStepPath: nextPath,
        completedSteps,
        hasUnsavedProgress: true,
      },
    };

    return { state };
  }

  return {
    startWizard,
    closeWizard: (state: WizardState, force = false) => {
      const w = state.activeWizard;
      if (!w) return { state, closed: true };

      if (!force && w.hasUnsavedProgress) {
        const ok = deps.confirm?.(
          'You have unsaved progress in this wizard. Close anyway?'
        );
        if (ok === false) return { state, closed: false };
      }

      return {
        state: { ...state, activeWizard: null, wizardContext: null },
        closed: true,
      };
    },
    goToStep,
    previousStep,
    setAnswer,
    setLlmResult,
    clearLlmResult,
    processLlmStep,
    setLlmDraft,
    bakeWizard,
    nextStep,
  };
}
