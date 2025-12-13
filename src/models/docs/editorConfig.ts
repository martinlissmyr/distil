// src/models/docs/editorConfig.ts
/**
 * Editor Configuration Model
 *
 * Defines TipTap editor behavior and UI for each document kind.
 * Centralizes toolbar items, extensions, and formatting options.
 */

/** Toolbar item types supported across all editors */
export type ToolbarItemType =
  | 'heading'
  | 'paragraph'
  | 'bulletList'
  | 'orderedList'
  | 'horizontalRule';

/** Individual toolbar item configuration */
export type ToolbarItem = {
  type: ToolbarItemType;
  /** For heading type: 1, 2, or 3 */
  level?: number;
  /** Display label (auto-generated if not provided) */
  label?: string;
};

/**
 * Complete editor configuration for a document kind
 */
export type EditorConfig = {
  /** Which heading levels to enable (e.g., [2, 3] for H2 and H3) */
  headingLevels: number[];

  /** Enable bullet and ordered lists */
  lists: boolean;

  /** Enable horizontal rule separator */
  horizontalRule: boolean;

  /** Toolbar button configuration (in display order) */
  toolbar: ToolbarItem[];

  /** Placeholder text shown when editor is empty */
  placeholder: string;
};

/**
 * Default editor config for prose (most restrictive)
 */
export const proseEditorConfig: EditorConfig = {
  headingLevels: [2, 3],
  lists: false,
  horizontalRule: false,
  toolbar: [
    { type: 'heading', level: 2, label: 'H2' },
    { type: 'heading', level: 3, label: 'H3' },
    { type: 'paragraph' },
  ],
  placeholder: 'Start typing…',
};

/**
 * Default editor config for meta documents (more features)
 */
export const metaEditorConfig: EditorConfig = {
  headingLevels: [1, 2],
  lists: true,
  horizontalRule: true,
  toolbar: [
    { type: 'heading', level: 1, label: 'H2' },
    { type: 'heading', level: 2, label: 'H3' },
    { type: 'paragraph' },
    { type: 'bulletList' },
    { type: 'orderedList' },
    { type: 'horizontalRule' },
  ],
  placeholder: 'Start typing…',
};

/**
 * Get display label for a toolbar item
 */
export function getToolbarItemLabel(item: ToolbarItem): string {
  if (item.label) return item.label;

  switch (item.type) {
    case 'heading':
      return item.level === 1 ? 'H2' : item.level === 2 ? 'H3' : `H${item.level}`;
    case 'paragraph':
      return 'Body';
    case 'bulletList':
      return 'Bulleted';
    case 'orderedList':
      return 'Numbered';
    case 'horizontalRule':
      return 'Rule';
    default:
      return '';
  }
}
