// src/ui/editor/extensions/metaExtensions.ts
import type { Extension } from '@tiptap/core';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { createBaseExtensions } from './sharedExtensions';

type MetaExtensionsOptions = {
  placeholder?: string;
};

export function metaExtensions(
  { placeholder = '' }: MetaExtensionsOptions = {}
): Extension[] {
  return createBaseExtensions({
    placeholder,
    headingLevels: [1, 2],
    starterKitConfig: {
      heading: false,
      bulletList: false,
      orderedList: false,
      horizontalRule: false,
    },
    extraExtensions: [
      BulletList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
      }),
      HorizontalRule,
    ],
  });
}