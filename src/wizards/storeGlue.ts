// src/wizards/storeGlue.ts
import type { MetaDocKey } from '../types/metaDoc';
import type { WizardActions, WizardContext, WizardState, LlmProcessingStep } from './types';
import { createWizardEngine } from './engine';
import { metaId } from '../state/useAppStore';
import type { MetaDocState } from '../types/metaDoc';
import { docKinds } from '../models/docs';

export function createWizardActions(args: {
  set: (fn: any) => void;
  get: () => any;
  sendChat: (args: { messages: Array<{ role: 'system' | 'user'; content: string }> }) => Promise<any>;
}) {
  const service = createWizardEngine({
    sendChat: args.sendChat,
    mockMode: true,
    mockDelayMs: 800,

    resolveMetaDocsMarkdown: async (ctx) => {
      const metaDocs: Record<string, MetaDocState> = args.get().metaDocs;

      // no hard-coded keys: derive all meta docs from doc model
      const keys = Object.keys(docKinds).filter((k) => docKinds[k as any].role === 'meta') as MetaDocKey[];
      const out: Partial<Record<MetaDocKey, string | null>> = {};

      for (const key of keys) {
        const scope =
          docKinds[key].scope === 'root'
            ? ({ scope: 'root' } as const)
            : ctx.ref.scope === 'story'
              ? ({ scope: 'story', projectId: ctx.ref.projectId, storyId: ctx.ref.storyId } as const)
              : ({ scope: 'root' } as const);

        out[key] = metaDocs[metaId(scope, key)]?.markdown ?? null;
      }

      return out;
    },

    insertIntoEditor: async (ctx, text) => {
      const editor = ctx.targetEditor;
      if (!editor) {
        // fallback: store wizardResult
        args.set((s: any) => ({ wizardResult: text }));
        return;
      }

      try {
        const current = editor.getMarkdown();
        const merged = current.trim() ? `${current}\n\n${text}` : text;
        const json = editor.markdown.parse(merged);
        editor.commands.setContent(json);
      } catch {
        args.set((s: any) => ({ wizardResult: text }));
      }
    },

    alert: (m) => alert(m),
    confirm: (m) => confirm(m),
  });

  const actions: WizardActions = {
    startWizard: async (wizardId: string, context: WizardContext) => {
      const next = await service.startWizard(wizardId, context);
      args.set(() => next);
      args.set(() => ({ wizardResult: null }));
    },

    closeWizard: (force = false) => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      const { state: next, closed } = service.closeWizard(state, force);
      if (closed) args.set(() => next);
      return closed;
    },

    goToStep: (stepPath) => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      args.set(() => service.goToStep(state, stepPath));
    },

    nextStep: async () => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      const { state: next, completed, bakedText } = await service.nextStep(state);

      args.set(() => next);

      if (completed) {
        // close wizard in store
        args.set(() => ({ activeWizard: null, wizardContext: null }));
        if (bakedText) args.set(() => ({ wizardResult: bakedText }));
      }
    },

    previousStep: () => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      args.set(() => service.previousStep(state));
    },

    setAnswer: (stepId, value) => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      args.set(() => service.setAnswer(state, stepId, value));
    },

    getAnswer: (stepId) => args.get().activeWizard?.answers?.[stepId],

    processLlmStep: async (step: LlmProcessingStep) => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      const next = await service.processLlmStep(state, step);
      args.set(() => next);
    },

    clearLlmResult: (resultKey) => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      args.set(() => service.clearLlmResult(state, resultKey));
    },

    bakeWizard: async () => {
      const state: WizardState = { activeWizard: args.get().activeWizard, wizardContext: args.get().wizardContext };
      return service.bakeWizard(state);
    },

    insertResult: async (text: string) => {
      const ctx = args.get().wizardContext;
      if (!ctx) {
        args.set(() => ({ wizardResult: text }));
        return;
      }
      await service['insertIntoEditor']?.(ctx, text);
    },
  };

  return actions;
}