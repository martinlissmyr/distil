// src/hooks/useChatScroll.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import type { ChatMessage } from './useChatMessages';

/**
 * Hook for managing auto-scroll behavior in chat
 * Focuses on target message (user or hint) by scrolling it to top with space below
 * Does not recalculate during typing animation for stability
 */
export function useChatScroll(messages: ChatMessage[], isInitializing: boolean = false) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const lastFocusedIndexRef = useRef<number>(-1);

  // Measure viewport height
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const updateHeight = () => {
      setViewportHeight(vp.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(vp);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate and focus on target message ONCE when messages/initialization changes
  const focusTargetMessage = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    const spacer = spacerRef.current;

    if (!vp || !content || messages.length === 0 || viewportHeight === 0 || isInitializing) {
      setSpacerHeight(0);
      lastFocusedIndexRef.current = -1;
      return;
    }

    // Find the last user message OR last ephemeral assistant message (hint)
    const lastUserMessageIndex = messages.findLastIndex((m: ChatMessage) => m.role === 'user');
    const lastHintIndex = messages.findLastIndex((m: ChatMessage) => m.role === 'assistant' && m.ephemeral);

    // Use whichever is later in the message list (or -1 if neither exists)
    const targetMessageIndex = Math.max(lastUserMessageIndex, lastHintIndex);

    if (targetMessageIndex === -1) {
      setSpacerHeight(0);
      lastFocusedIndexRef.current = -1;
      return;
    }

    // Only recalculate if target changed
    if (targetMessageIndex === lastFocusedIndexRef.current) {
      return;
    }

    lastFocusedIndexRef.current = targetMessageIndex;

    const messageElements = vp.querySelectorAll('[data-message-bubble]');
    const targetElement = messageElements[targetMessageIndex] as HTMLElement;

    if (!targetElement) {
      setSpacerHeight(0);
      return;
    }

    const desiredOffset = 140;
    const clientHeight = vp.clientHeight;

    // Get the bottom of the target message
    const targetMessageBottom = targetElement.offsetTop + targetElement.offsetHeight;

    // Calculate content below target message (excluding the spacer itself)
    const currentSpacerHeight = spacer?.offsetHeight || 0;
    const totalContentHeight = content.scrollHeight - currentSpacerHeight;
    const contentBelowTargetMessage = totalContentHeight - targetMessageBottom;

    // Space needed below target message
    const spaceNeeded = clientHeight - desiredOffset;

    // Spacer fills the gap
    const newSpacerHeight = Math.max(0, spaceNeeded - contentBelowTargetMessage);

    setSpacerHeight(newSpacerHeight);

    // Scroll to bottom after spacer is applied
    requestAnimationFrame(() => {
      setTimeout(() => {
        vp.scrollTo({
          top: vp.scrollHeight - vp.clientHeight,
          behavior: 'smooth',
        });
      }, 100);
    });
  }, [messages, viewportHeight, isInitializing]);

  // Focus when messages or initialization state changes
  useEffect(() => {
    focusTargetMessage();
  }, [focusTargetMessage]);

  return { viewportRef, contentRef, spacerRef, spacerHeight };
}
