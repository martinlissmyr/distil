// src/wizards/storeGlue.ts
import type { RefObject } from 'react';
import type { WizardActions, WizardContext, WizardState, LlmProcessingStep } from './types';
import { createWizardEngine } from './engine';
import { docIdForMeta } from '../state/useAppStore';
import { insertIntoTextarea } from '../helpers/inputHelpers';

export function createWizardActions(args: {
  set: (fn: any) => void;
  get: () => any;
  sendChat: (args: { messages: Array<{ role: 'system' | 'user'; content: string }> }) => Promise<any>;
}) {
  const service = createWizardEngine({
    sendChat: args.sendChat,
    mockMode: false,
    mockDelayMs: 800,

    insertIntoEditor: async (ctx, text) => {
      const editor = ctx.targetEditor;
      const inputRef = ctx.targetInputRef;

      if (!editor && !inputRef) {
        // fallback: store wizardResult
        args.set(() => ({ wizardResult: text }));
        return;
      }

      if (editor) {
        try {
          const current = editor.getMarkdown();
          const merged = current.trim() ? `${current}\n\n${text}` : text;
          const json = editor.markdown.parse(merged);
          editor.commands.setContent(json);

          const scope =
            ctx.ref.scope === 'story'
              ? ({ scope: 'story', projectId: ctx.ref.projectId, storyId: ctx.ref.storyId } as const)
              : ({ scope: 'root' } as const);

          const docId = docIdForMeta(scope, 'brief');
          args.get().bumpDocRevision(docId);
          return;
        } catch {
          args.set(() => ({ wizardResult: text }));
          return;
        }
      }

      if (inputRef) {
        const ok = insertIntoTextarea(inputRef as RefObject<HTMLTextAreaElement>, text, 'replace');
        if (!ok) {
          args.set(() => ({ wizardResult: text }));
        }
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
      args.set((s: any) => ({
        activeWizard: s.activeWizard
          ? { ...s.activeWizard, isLlmProcessing: true, error: undefined }
          : s.activeWizard,
      }));

      const state: WizardState = {
        activeWizard: args.get().activeWizard,
        wizardContext: args.get().wizardContext,
      };

      const next = await service.processLlmStep(state, step);
      args.set(() => next);
    },

    setLlmResult: (resultKey, value) => {
      const state: WizardState = {
        activeWizard: args.get().activeWizard,
        wizardContext: args.get().wizardContext,
      };
      args.set(() => service.setLlmResult(state, resultKey, value));
    },

    setLlmDraft: (resultKey, value) => {
      const state: WizardState = {
        activeWizard: args.get().activeWizard,
        wizardContext: args.get().wizardContext,
      };
      args.set(() => service.setLlmDraft(state, resultKey, value));
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
      const insertFn = (service as any)['insertIntoEditor'];
      if (insertFn) {
        await insertFn(ctx, text);
      }
    },
  };

  return actions;
}