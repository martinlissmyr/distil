// src/hooks/useChatScroll.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import type { ChatMessage } from './useChatMessages';

/**
 * Hook for managing auto-scroll behavior in chat
 * Scrolls user message or ephemeral assistant message (hint) to top with space below for response
 */
export function useChatScroll(messages: ChatMessage[], isInitializing: boolean = false) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [spacerHeight, setSpacerHeight] = useState(0);

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

  // Calculate spacer height - recalculate when content changes size
  const calculateSpacer = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    const spacer = spacerRef.current;

    if (!vp || !content || messages.length === 0 || viewportHeight === 0 || isInitializing) {
      setSpacerHeight(0);
      return;
    }

    // Find the last user message OR last ephemeral assistant message (hint)
    // This gives the message we want to scroll into view with space below
    const lastUserMessageIndex = messages.findLastIndex((m: ChatMessage) => m.role === 'user');
    const lastHintIndex = messages.findLastIndex((m: ChatMessage) => m.role === 'assistant' && m.ephemeral);

    // Use whichever is later in the message list (or -1 if neither exists)
    const targetMessageIndex = Math.max(lastUserMessageIndex, lastHintIndex);

    if (targetMessageIndex === -1) {
      setSpacerHeight(0);
      return;
    }

    const messageElements = vp.querySelectorAll('[data-message-bubble]');
    const targetElement = messageElements[targetMessageIndex] as HTMLElement;

    if (!targetElement) {
      setSpacerHeight(0);
      return;
    }

    const desiredOffset = 140;
    const clientHeight = vp.clientHeight;

    // Get the bottom of the target message (user or hint)
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
  }, [messages, viewportHeight, isInitializing]);

  // Recalculate when messages change
  useEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        calculateSpacer();
      }, 100);
    });
  }, [messages, calculateSpacer]);

  // Watch for content size changes (typing animation)
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateSpacer();
    });

    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [calculateSpacer]);

  // Scroll to bottom when messages change (after last message is rendered)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || messages.length === 0 || isInitializing) {
      return;
    }

    // Wait for DOM to update
    requestAnimationFrame(() => {
      // Scroll to the absolute bottom
      vp.scrollTo({
        top: vp.scrollHeight - vp.clientHeight,
        behavior: 'smooth',
      });
    });
  }, [messages, isInitializing, spacerHeight]); 

  return { viewportRef, contentRef, spacerRef, spacerHeight };
}
