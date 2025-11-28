// src/components/editor/chat/useChatScroll.ts
import { useRef, useEffect } from 'react';

/**
 * Hook for managing auto-scroll behavior in chat
 * Automatically scrolls to bottom when new messages are added
 */
export function useChatScroll(messageCount: number) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
  }, [messageCount]);

  return viewportRef;
}
