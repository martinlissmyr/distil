// src/hooks/useScopeManager.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { QuestionScope } from '../types/chat';

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
  const [manualScope, setManualScope] = useState<QuestionScope>(
    hasSelection ? 'selection' : 'text'
  );
  const [selectionPillDismissed, setSelectionPillDismissed] = useState(false);
  const resetDismissTimerRef = useRef<number | null>(null);

  // Reset dismissal when selection is cleared
  useEffect(() => {
    if (!hasSelection) {
      resetDismissTimerRef.current = window.setTimeout(() => {
        setSelectionPillDismissed(false);
        resetDismissTimerRef.current = null;
      }, 0);
    }

    return () => {
      if (resetDismissTimerRef.current !== null) {
        window.clearTimeout(resetDismissTimerRef.current);
        resetDismissTimerRef.current = null;
      }
    };
  }, [hasSelection, selectionPillDismissed]);

  const scope: QuestionScope =
    hasSelection && !selectionPillDismissed ? 'selection' : manualScope;

  const dismissSelectionPill = useCallback(() => {
    setSelectionPillDismissed(true);
    setManualScope('text');
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
