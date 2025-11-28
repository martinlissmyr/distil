// src/components/editor/chat/useScopeManager.ts
import { useState, useEffect, useCallback } from 'react';
import type { QuestionScope } from '../../../types/chat';

interface UseScopeManagerOptions {
  hasSelection: boolean;
}

interface UseScopeManagerResult {
  scope: QuestionScope;
  selectionPillDismissed: boolean;
  showSelectionPill: boolean;
  dismissSelectionPill: () => void;
}

/**
 * Hook for managing chat scope state (selection vs full text)
 * Automatically switches to 'selection' when text is selected
 */
export function useScopeManager({
  hasSelection,
}: UseScopeManagerOptions): UseScopeManagerResult {
  const [scope, setScope] = useState<QuestionScope>(
    hasSelection ? 'selection' : 'text'
  );
  const [selectionPillDismissed, setSelectionPillDismissed] = useState(false);

  // When selection changes from editor, auto-switch scope
  useEffect(() => {
    if (hasSelection && !selectionPillDismissed) {
      setScope('selection');
    } else {
      setScope('text');
    }

    // Reset dismissal when selection is cleared
    if (!hasSelection) {
      setSelectionPillDismissed(false);
    }
  }, [hasSelection, selectionPillDismissed]);

  const dismissSelectionPill = useCallback(() => {
    setSelectionPillDismissed(true);
    setScope('text');
  }, []);

  const showSelectionPill =
    scope === 'selection' && hasSelection && !selectionPillDismissed;

  return {
    scope,
    selectionPillDismissed,
    showSelectionPill,
    dismissSelectionPill,
  };
}
