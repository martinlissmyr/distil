// src/state/markdownUtils.ts
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';

// Use the SAME extensions as MetaTextEditor
import { metaExtensions } from '../components/editor/extensions/metaExtensions';

// Singleton editor instance, reused across calls
let markdownEditor: Editor | null = null;

function getMarkdownEditor(): Editor {
  if (!markdownEditor) {
    markdownEditor = new Editor({
      extensions: [
        ...metaExtensions({ placeholder: '' }),
      ],
      content: {
        type: 'doc',
        content: [],
      },
      contentType: 'json',
    });
  }
  return markdownEditor;
}

/**
 * Convert a TipTap JSON document to Markdown using the same
 * schema/extensions as the meta editors, via the Markdown extension.
 */
export function jsonToMarkdown(doc: JSONContent): string {
  const editor = getMarkdownEditor();

  // Replace content with the provided JSON
  editor.commands.setContent(doc, false);

  // Markdown extension adds getMarkdown(); keep your existing call style
  // Depending on your tiptap/markdown version this is either:
  // editor.storage.markdown.getMarkdown() or editor.getMarkdown()
  const md =
    (editor as any).getMarkdown?.() ??
    (editor as any).storage?.markdown?.getMarkdown?.() ??
    '';

  return md.trim();
}