// src/ui/story/ChapterNavigation.tsx
import type { TopNavigationButton } from '../common/TopNavigation';

export type ChapterNavigationConfig = {
  /** Whether multi-part mode is enabled */
  partsEnabled: boolean;
  /** Current part index (0-based) */
  currentPartIndex?: number;
  /** Total number of parts */
  totalParts?: number;
  /** Navigate to previous part */
  onPreviousPart?: () => void;
  /** Navigate to next part */
  onNextPart?: () => void;
  /** Whether previous button should be disabled */
  canGoPrevious?: boolean;
  /** Whether next button should be disabled */
  canGoNext?: boolean;
};

/**
 * Builds the button array for TopNavigation based on chapter navigation state.
 *
 * When partsEnabled is false:
 * - Returns empty array (menu will be shown via menuItems prop)
 *
 * When partsEnabled is true:
 * - Shows back button (navigate to previous part)
 * - Shows forward button (navigate to next part)
 * - Shows parts button (open chapter overview)
 */
export function useChapterNavigationButtons({
  partsEnabled,
  currentPartIndex = 0,
  totalParts = 0,
  onPreviousPart,
  onNextPart,
  canGoPrevious = true,
  canGoNext = true,
}: ChapterNavigationConfig): TopNavigationButton[] {
  if (!partsEnabled) {
    // Single-part mode: no navigation buttons (menu will handle "Enable Chapters")
    return [];
  }

  // Multi-part mode: show navigation buttons
  return [
    {
      icon: 'back',
      onClick: () => onPreviousPart?.(),
      enabled: canGoPrevious && currentPartIndex > 0,
    },
    {
      icon: 'forward',
      onClick: () => onNextPart?.(),
      enabled: canGoNext && currentPartIndex < totalParts - 1,
    },
  ];
}
