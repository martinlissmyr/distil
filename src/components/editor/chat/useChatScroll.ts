// src/components/editor/chat/useChatScroll.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import type { ChatMessage } from './useChatMessages';

/**
 * Hook for managing auto-scroll behavior in chat
 * Scrolls user message to top with space below for assistant response
 */
export function useChatScroll(messages: ChatMessage[]) {
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

    if (!vp || !content || messages.length === 0 || viewportHeight === 0) {
      setSpacerHeight(0);
      return;
    }

    // Find the last user message
    const lastUserMessageIndex = messages.findLastIndex((m) => m.role === 'user');
    if (lastUserMessageIndex === -1) {
      setSpacerHeight(0);
      return;
    }

    const messageElements = vp.querySelectorAll('[data-message-bubble]');
    const targetElement = messageElements[lastUserMessageIndex] as HTMLElement;

    if (!targetElement) {
      setSpacerHeight(0);
      return;
    }

    const desiredOffset = 60;
    const clientHeight = vp.clientHeight;

    // Get the bottom of the user message
    const userMessageBottom = targetElement.offsetTop + targetElement.offsetHeight;

    // Calculate content below user message (excluding the spacer itself)
    const currentSpacerHeight = spacer?.offsetHeight || 0;
    const totalContentHeight = content.scrollHeight - currentSpacerHeight;
    const contentBelowUserMessage = totalContentHeight - userMessageBottom;

    // Space needed below user message
    const spaceNeeded = clientHeight - desiredOffset;

    // Spacer fills the gap
    const newSpacerHeight = Math.max(0, spaceNeeded - contentBelowUserMessage);

    setSpacerHeight(newSpacerHeight);
  }, [messages, viewportHeight]);

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

  // Scroll to last user message when messages change
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || messages.length === 0) return;

    // Find the last user message
    const lastUserMessageIndex = messages.findLastIndex((m) => m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    // Wait for DOM to update
    requestAnimationFrame(() => {
      const messageElements = vp.querySelectorAll('[data-message-bubble]');
      const targetElement = messageElements[lastUserMessageIndex] as HTMLElement;

      if (targetElement) {
        // Calculate the target scroll position with offset for the top overlay
        const targetTop = targetElement.offsetTop;
        const overlayHeight = 60; // Height of top overlay
        const scrollToPosition = Math.max(0, targetTop - overlayHeight);

        // Scroll to the calculated position
        vp.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
      }
    });
  }, [messages]);

  return { viewportRef, contentRef, spacerRef, spacerHeight };
}
