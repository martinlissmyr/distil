// src/ui/editor/extensions/sharedExtensions.ts
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { Selection } from '@tiptap/extensions/selection';

import type { Extension } from '@tiptap/core';

export type BaseExtensionsOptions = {
  placeholder?: string;

  // what heading levels this editor should support
  headingLevels?: number[];

  // StarterKit overrides so each editor can disable pieces it doesn’t want
  starterKitConfig?: Parameters<typeof StarterKit.configure>[0];
  
  // Any extra extensions specific to this editor
  extraExtensions?: Extension[];
};

export function createBaseExtensions({
  placeholder = '',
  headingLevels = [2, 3],
  starterKitConfig = {},
  extraExtensions = [],
}: BaseExtensionsOptions = {}): Extension[] {
  return [
    Markdown.configure({}),
    Selection,
    StarterKit.configure({
      heading: false, // we always use Heading extension explicitly
      ...starterKitConfig,
    }),
    Heading.configure({
      levels: headingLevels,
    }),
    ...extraExtensions,
    Placeholder.configure({
      placeholder,
      includeChildren: true,
      showOnlyWhenEditable: true,
    }),
  ];
}