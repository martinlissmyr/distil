import { useCallback } from 'react';
import { useAppStore } from '../state/useAppStore';
import type { WizardContext } from '../wizards/types';
import type { ChatConfig } from '../ui/editor/ProseEditor';
import { useNavigation } from './useNavigation';
import type { RefObject } from 'react';

export type EditorChatHookProps = {
  chatConfig?: ChatConfig;
  /**
   * Optional: pass the TipTap editor for wizard integration.
   * If not provided, wizards will still work but without direct editor access.
   */
  editor?: any;
  targetInputRef: RefObject;
};

/**
 * Hook to handle wizard opening from chat suggestions.
 * Extracted from BaseEditor to make it reusable in EntityEditView.
 */
export function useEditorChat(props: EditorChatHookProps) {
  const { chatConfig, editor } = props;
  const startWizard = useAppStore((s) => (s as any).startWizard);
  const { setStorySection, goToManifest } = useNavigation();

  const handleOpenWizard = useCallback(
    (cmd: { wizardId: string; editor?: any; targetInputRef?: RefObject; }) => {
      if (!startWizard || typeof startWizard !== 'function') {
        console.warn('[useEditorChat] startWizard not found on store');
        return;
      }

      // Build ctx.ref from chatConfig or doc
      const projectId = (chatConfig as any)?.projectId as string | undefined;
      const storyId = (chatConfig as any)?.storyId as string | undefined;

      const ref =
        projectId && storyId
          ? ({ scope: 'story', projectId, storyId } as const)
          : ({ scope: 'root' } as const);

      const ctx: WizardContext = {
        ref,
        targetEditor: cmd.editor || editor,
        targetInputRef: cmd.targetInputRef || null,
      } as any;

      startWizard(cmd.wizardId, ctx);
    },
    [startWizard, editor, chatConfig]
  );

  const handleNavigate = useCallback((target: string) => {
    if (target === 'manifest') {
      goToManifest();
    } else {
      setStorySection(target as any);
    }
  }, [setStorySection, goToManifest]);

  return {
    handleOpenWizard,
    handleNavigate,
  };
}
