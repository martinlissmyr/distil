// src/wizards/engine.ts
import type { MetaDocKey, MetaScope } from '../types/metaDoc';
import type { WizardContext, WizardConfig, WizardStep, LlmProcessingStep, WizardState, ActiveWizard } from './types';
import { getWizardConfig } from './registry';
import { getCurrentStep, getNextStepPath, getPreviousStepPath, isStepComplete } from './navigation';
import { interpolate } from '../helpers/interpolate';

export type WizardDeps = {
  // Resolve markdown for meta docs used in interpolation (manifest/brief/outline/world/etc)
  resolveMetaDocsMarkdown: (ctx: WizardContext) => Promise<Partial<Record<MetaDocKey, string | null>>>;

  // Chat boundary
  sendChat: (args: { messages: Array<{ role: 'system' | 'user'; content: string }> }) => Promise<{
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
  async function startWizard(
    wizardId: string,
    context: WizardContext
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

    const prev = getPreviousStepPath(activeWizard.config, activeWizard.currentStepPath);
    if (!prev) return state;

    return {
      ...state,
      activeWizard: { ...activeWizard, currentStepPath: prev },
    };
  }

  function setAnswer(state: WizardState, stepId: string, value: any): WizardState {
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

  function clearLlmResult(state: WizardState, resultKey: string): WizardState {
    const { activeWizard } = state;
    if (!activeWizard) return state;

    const next = { ...activeWizard.llmResults };
    delete next[resultKey];

    return {
      ...state,
      activeWizard: { ...activeWizard, llmResults: next },
    };
  }

  async function processLlmStep(state: WizardState, step: LlmProcessingStep): Promise<WizardState> {
    const { activeWizard, wizardContext } = state;
    if (!activeWizard || !wizardContext) return state;

    // mark processing
    state = {
      ...state,
      activeWizard: { ...activeWizard, isLlmProcessing: true, error: undefined },
    };

    try {
      // mock mode
      if (deps.mockMode) {
        await new Promise((r) => setTimeout(r, deps.mockDelayMs ?? 800));
        const mock: Record<string, string> = {
          writing_tip: "Show, don't tell—use action and sensory detail.",
          project_summary: 'Mock summary (2–3 sentences).',
          default: 'Mock result.',
        };
        const value = mock[step.resultKey] ?? mock.default;

        const w = state.activeWizard!;
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

      const metaDocsMarkdown = await deps.resolveMetaDocsMarkdown(wizardContext);

      // Merge contexts: answers, llmResults, and non-null metaDocs
      const vars = {
        ...activeWizard.answers,
        ...activeWizard.llmResults,
        ...Object.fromEntries(
          Object.entries(metaDocsMarkdown).filter(([_, v]) => v !== null)
        ),
      };

      // Interpolate system and user separately
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (step.prompt.system) {
        messages.push({ role: 'system', content: interpolate(step.prompt.system, vars) });
      }
      messages.push({ role: 'user', content: interpolate(step.prompt.user, vars) });

      const res = await deps.sendChat({ messages });
      if (!res.ok || !res.data?.output_text) throw new Error(res.error || 'Chat error');

      let result: any = res.data.output_text;
      if (step.extractJson) {
        const m = result.match(/```json\n([\s\S]*?)\n```/);
        result = JSON.parse(m ? m[1] : result);
      }

      const w = state.activeWizard!;
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

  async function nextStep(state: WizardState): Promise<{ state: WizardState; completed?: boolean; bakedText?: string }> {
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

    const next = getCurrentStep(w.config, nextPath);
    if (next?.type === 'llm-processing') {
      state = await processLlmStep(state, next);
      if (next.hidden) {
        // auto-advance
        return nextStep(state);
      }
    }

    return { state };
  }

  return {
    startWizard,
    closeWizard: (state: WizardState, force = false) => {
      const w = state.activeWizard;
      if (!w) return { state, closed: true };

      if (!force && w.hasUnsavedProgress) {
        const ok = deps.confirm?.('You have unsaved progress in this wizard. Close anyway?');
        if (ok === false) return { state, closed: false };
      }

      return { state: { ...state, activeWizard: null, wizardContext: null }, closed: true };
    },
    goToStep,
    previousStep,
    setAnswer,
    clearLlmResult,
    processLlmStep,
    bakeWizard,
    nextStep,
  };
}