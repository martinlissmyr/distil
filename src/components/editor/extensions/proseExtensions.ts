// src/components/editor/extensions/proseExtensions.ts
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { PersistentSelectionHighlight } from './PersistentSelectionHighlight';

import type { Extension } from '@tiptap/core';

type ProseExtensionsOptions = {
  placeholder?: string;
};

export function proseExtensions(
  { placeholder = '' }: ProseExtensionsOptions = {}
): Extension[] {
  return [
    Markdown,
    PersistentSelectionHighlight,
    StarterKit.configure({
      heading: false, // we'll use the dedicated Heading extension below
    }),
    Heading.configure({
      // H2/H3 inside the text. H1 is your big document title outside TipTap.
      levels: [2, 3],
    }),
    Placeholder.configure({
      placeholder,
      includeChildren: true,
      showOnlyWhenEditable: true,
    }),
  ];
}