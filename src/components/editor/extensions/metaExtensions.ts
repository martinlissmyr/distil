// src/components/editor/extensions/metaExtensions.ts
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { PersistentSelectionHighlight } from './PersistentSelectionHighlight';

import type { Extension } from '@tiptap/core';

type MetaExtensionsOptions = {
  placeholder?: string;
};

export function metaExtensions(
  { placeholder = '' }: MetaExtensionsOptions = {}
): Extension[] {
  return [
    Markdown,
    PersistentSelectionHighlight,
    StarterKit.configure({
      heading: false,
    }),
    Heading.configure({
      levels: [1, 2],
    }),
    BulletList.configure({
      keepMarks: true,
      keepAttributes: true,
    }),
    OrderedList.configure({
      keepMarks: true,
      keepAttributes: true,
    }),
    HorizontalRule,
    Placeholder.configure({
      placeholder,
      includeChildren: true,
      showOnlyWhenEditable: true,
    }),
  ];
}