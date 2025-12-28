// src/hooks/useDebouncedCallback.ts
import { useEffect, useRef } from 'react';

/**
 * Creates a debounced version of a callback function with manual control.
 *
 * @param fn - The callback function to debounce
 * @param delayMs - Delay in milliseconds before executing the callback
 * @returns Object with `call` (to invoke debounced function) and `cancel` (to cancel pending execution)
 *
 * @example
 * const { call, cancel } = useDebouncedCallback(saveData, 500);
 * call(newValue); // Will execute after 500ms unless called again or cancelled
 * cancel(); // Cancels any pending execution
 */
export function useDebouncedCallback<TArgs extends any[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  delayMs: number
) {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const cancel = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const call = (...args: TArgs) => {
    cancel();
    timeoutRef.current = window.setTimeout(() => fn(...args), delayMs);
  };

  return { call, cancel };
}
