// src/ui/editor/editorConfigFactory.tsx
/**
 * Editor Config Factory
 *
 * Converts EditorConfig from doc model into:
 * - TipTap extension arrays
 * - EditorToolbar component with toolbar items
 */

import React from 'react';
import type { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Icon } from '../../common/Icon';
import { createBaseExtensions } from '../extensions/sharedExtensions';
import { EditorToolbar } from './EditorToolbar';
import type { EditorConfig, ToolbarItem } from '../../../models/docs/editorConfig';
import { getToolbarItemLabel } from '../../../models/docs/editorConfig';
import { getDocKind } from '../../../models/docs';

/**
 * Create TipTap extensions array from EditorConfig
 */
export function createExtensionsFromConfig(config: EditorConfig): Extension[] {
  const extraExtensions: Extension[] = [];

  // Add list extensions if enabled
  if (config.lists) {
    extraExtensions.push(
      BulletList.configure({
        keepMarks: true,
        keepAttributes: true,
      }) as Extension,
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
      }) as Extension
    );
  }

  // Add horizontal rule if enabled
  if (config.horizontalRule) {
    extraExtensions.push(HorizontalRule as Extension);
  }

  return createBaseExtensions({
    placeholder: config.placeholder,
    headingLevels: config.headingLevels,
    starterKitConfig: {
      heading: false, // always use explicit Heading extension
      bulletList: false, // controlled by config.lists
      orderedList: false, // controlled by config.lists
      horizontalRule: false, // controlled by config.horizontalRule
    },
    extraExtensions,
  });
}

/**
 * Get icon component for a toolbar item
 */
function getToolbarItemIcon(item: ToolbarItem): React.ReactNode {
  switch (item.type) {
    case 'heading': {
      const label = getToolbarItemLabel(item);
      switch (label) {
        case 'H2':
          return <Icon type="h2" />
        case 'H3':
          return <Icon type="h3" />
        default:
          return null;
      }
    }
    case 'bulletList':
      return <Icon type="bulletList" />;
    case 'orderedList':
      return <Icon type="orderedList" />;
    case 'horizontalRule':
      return <Icon type="horizontalRule" />;
    default:
      return null;
  }
}

/**
 * Create toolbar onClick handler for a toolbar item
 */
function createToolbarItemHandler(item: ToolbarItem, editor: Editor | null): () => void {
  if (!editor) return () => {};

  switch (item.type) {
    case 'heading':
      // Note: TipTap heading levels map to HTML heading levels (1 = h1, 2 = h2, 3 = h3)
      // But our UI labels them differently (level 1 → "H2", level 2 → "H3")
      return () => editor.chain().focus().toggleHeading({ level: item.level as any }).run();
    case 'paragraph':
      return () => editor.chain().focus().setParagraph().run();
    case 'bulletList':
      return () => editor.chain().focus().toggleBulletList().run();
    case 'orderedList':
      return () => editor.chain().focus().toggleOrderedList().run();
    case 'horizontalRule':
      return () => editor.chain().focus().setHorizontalRule().run();
    default:
      return () => {};
  }
}

/**
 * Create EditorToolbar component from EditorConfig
 */
export function createToolbarFromConfig(
  config: EditorConfig,
  editor: Editor | null
): React.ReactElement {
  const toolbarItems = config.toolbar.map((item) => ({
    id: `${item.type}-${item.level ?? ''}`,
    label: getToolbarItemLabel(item),
    icon: getToolbarItemIcon(item),
    onClick: createToolbarItemHandler(item, editor),
  }));

  return <EditorToolbar items={toolbarItems} />;
}

/**
 * Get TipTap extensions for prose documents
 * Used to ensure consistent rendering across preview and export
 */
export function getProseExtensions() {
  const docKind = getDocKind('prose');
  const editorConfig = (docKind as any).editorConfig;
  return createExtensionsFromConfig(editorConfig);
}
