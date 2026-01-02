// src/ui/editor/defaultEmptyDoc.ts
import type { JSONContent } from '@tiptap/react';

/**
 * A clean blank TipTap document.
 * Used when no content exists yet.
 */
export const defaultEmptyDoc: JSONContent = {
  type: 'doc',
  content: [],
};