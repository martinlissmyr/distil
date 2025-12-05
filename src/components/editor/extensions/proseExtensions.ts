// src/components/editor/extensions/proseExtensions.ts
import type { Extension } from '@tiptap/core';
import { createBaseExtensions } from './sharedExtensions';

type ProseExtensionsOptions = {
  placeholder?: string;
};

export function proseExtensions(
  { placeholder = '' }: ProseExtensionsOptions = {}
): Extension[] {
  return createBaseExtensions({
    placeholder,
    headingLevels: [2, 3],
    starterKitConfig: {
      heading: false,
      // everything else default
    },
    extraExtensions: [], // nothing special here (for now)
  });
}