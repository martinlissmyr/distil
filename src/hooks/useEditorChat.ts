// src/hooks/useEditorChat.ts
import { useCallback } from 'react';
import { useAppStore } from '../state/useAppStore';
import type { WizardContext, WizardValueMap } from '../wizards/types';
import type { ChatConfig } from '../types/editor';
import { useNavigation } from './useNavigation';
import type { RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { EditorKind } from '../types/chat';
import type { StorySectionId } from '../models/sections';

export type EditorChatHookProps = {
  /**
   * Optional: Default chat config with projectId/storyId.
   * Can be overridden per-wizard-call via handleOpenWizard's chatConfig param.
   */
  chatConfig?: ChatConfig;
  /**
   * Optional: pass the TipTap editor for wizard integration.
   * If not provided, wizards will still work but without direct editor access.
   */
  editor?: Editor;
  targetInputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
};

const EDITOR_KINDS: EditorKind[] = [
  'prose',
  'manifest',
  'brief',
  'outline',
  'world',
  'characters',
  'locations',
];

function isEditorKind(value: unknown): value is EditorKind {
  return typeof value === 'string' && EDITOR_KINDS.includes(value as EditorKind);
}

/**
 * Hook to handle wizard opening and navigation from chat suggestions.
 * Used by WritingEnvironment and EntityEditView.
 */
export function useEditorChat(props: EditorChatHookProps) {
  const { chatConfig, editor } = props;
  const startWizard = useAppStore((s) => s.startWizard);
  const { setStorySection, goToManifest } = useNavigation();

  const handleOpenWizard = useCallback(
    (cmd: {
      wizardId: string;
      editor?: Editor;
      targetInputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
      currentContent?: string;
      currentProjection?: WizardValueMap;
      /** Override default chatConfig for this wizard invocation */
      chatConfig?: ChatConfig;
    }) => {
      if (!startWizard || typeof startWizard !== 'function') {
        console.warn('[useEditorChat] startWizard not found on store');
        return;
      }

      // Use per-call chatConfig if provided, otherwise fall back to hook's chatConfig
      const effectiveConfig = cmd.chatConfig || chatConfig || {};

      // Build ctx.ref from chatConfig or doc
      const projectId = effectiveConfig.projectId;
      const storyId = effectiveConfig.storyId;
      const docKind = isEditorKind(effectiveConfig.docKind) ? effectiveConfig.docKind : 'prose';

      const ref =
        projectId && storyId
          ? ({ scope: 'story', projectId, storyId, docKind } as const)
          : ({ scope: 'root', docKind } as const);

      const llmContextKinds = (effectiveConfig.llmContext?.kinds ?? []).filter(isEditorKind);

      const ctx: WizardContext = {
        ref,
        targetEditor: cmd.editor ?? editor,
        targetInputRef: cmd.targetInputRef ?? undefined,
        currentContent: cmd.currentContent,
        currentProjection: cmd.currentProjection,
        llmContext: {
          kinds: llmContextKinds,
          markdown: effectiveConfig.llmContext?.markdown ?? '',
        },
      };

      startWizard(cmd.wizardId, ctx);
    },
    [startWizard, editor, chatConfig]
  );

  const handleNavigate = useCallback((target: string) => {
    if (target === 'manifest') {
      goToManifest();
    } else {
      setStorySection(target as StorySectionId);
    }
  }, [setStorySection, goToManifest]);

  return {
    handleOpenWizard,
    handleNavigate,
  };
}
