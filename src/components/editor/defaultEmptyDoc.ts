// src/components/editor/defaultEmptyDoc.ts
import type { JSONContent } from '@tiptap/react';

/**
 * A clean blank TipTap document.
 * Used when no content exists yet.
 */
export const defaultEmptyDoc: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      // no content: [] needed, Tiptap will treat this as an empty paragraph
    },
  ],
};