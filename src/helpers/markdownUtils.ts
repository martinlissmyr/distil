// src/helpers/markdownUtils.ts
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';

import { metaExtensions } from '../ui/editor/extensions/metaExtensions';
import { proseExtensions } from '../ui/editor/extensions/proseExtensions';

// Singleton editor instances, reused across calls
// We maintain separate instances for meta and prose to match their different schemas
let metaMarkdownEditor: Editor | null = null;
let proseMarkdownEditor: Editor | null = null;

function getMetaMarkdownEditor(): Editor {
  if (!metaMarkdownEditor) {
    metaMarkdownEditor = new Editor({
      extensions: metaExtensions({ placeholder: '' }),
      content: { type: 'doc', content: [] },
      contentType: 'json',
    });
  }
  return metaMarkdownEditor;
}

function getProseMarkdownEditor(): Editor {
  if (!proseMarkdownEditor) {
    proseMarkdownEditor = new Editor({
      extensions: proseExtensions({ placeholder: '' }),
      content: { type: 'doc', content: [] },
      contentType: 'json',
    });
  }
  return proseMarkdownEditor;
}

/**
 * Convert a TipTap JSON document to Markdown.
 *
 * Note: This approach uses a singleton Editor instance to leverage TipTap's
 * official Markdown extension. While it feels heavy, this is the standard way
 * to convert TipTap JSON to Markdown, and the singleton pattern makes it efficient.
 *
 * @param doc - TipTap JSON content
 * @param schema - Which editor schema to use ('meta' for manifest/outline/brief, 'prose' for story text)
 */
export function jsonToMarkdown(
  doc: JSONContent,
  schema: 'meta' | 'prose' = 'meta'
): string {
  const editor = schema === 'meta'
    ? getMetaMarkdownEditor()
    : getProseMarkdownEditor();

  // Replace content with the provided JSON
  editor.commands.setContent(doc, false);

  // Get markdown from the extension
  // Different TipTap versions expose this differently, so we try both
  const md =
    (editor as any).getMarkdown?.() ??
    (editor as any).storage?.markdown?.getMarkdown?.() ??
    '';

  return md.trim();
}

/**
 * Helper specifically for meta documents (manifest, outline, brief).
 * Uses the meta extensions schema (H1, H2, bullet/ordered lists, horizontal rules).
 */
export function metaJsonToMarkdown(doc: JSONContent): string {
  return jsonToMarkdown(doc, 'meta');
}

/**
 * Helper specifically for prose documents (story text).
 * Uses the prose extensions schema (H2, H3, bullet/ordered lists, but no H1 or horizontal rules).
 */
export function proseJsonToMarkdown(doc: JSONContent): string {
  return jsonToMarkdown(doc, 'prose');
}
