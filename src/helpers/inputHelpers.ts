import type { RefObject } from 'react';

export function insertIntoTextarea(
  inputRef: RefObject<HTMLTextAreaElement>,
  text: string,
  mode: 'append' | 'replace' = 'append'
) {
  const el = inputRef.current;
  if (!el) return false;

  // Focus so selection APIs are correct (optional but nice)
  el.focus();

  const prev = el.value ?? '';
  const next =
    mode === 'replace'
      ? text
      : prev.trim()
      ? `${prev}\n\n${text}`
      : text;

  // --- IMPORTANT: set the value in a React-friendly way ---
  // React tracks value via a property descriptor on HTMLTextAreaElement.
  // Using the native setter ensures React sees the change.
  const proto = Object.getPrototypeOf(el);
  const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  valueSetter?.call(el, next);

  // Dispatch an input event so React/Mantine onChange fires
  el.dispatchEvent(new Event('input', { bubbles: true }));

  return true;
}