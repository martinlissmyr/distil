// electron/export/docxExporter.ts
import { DocxSerializer, defaultNodes, defaultMarks } from 'prosemirror-docx';
import { Packer } from 'docx';
import { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';

interface MergedPart {
  partId: string;
  partIndex: number;
  partTitle: string;
  content: any; // JSONContent
}

interface MergedStory {
  title: string;
  parts: MergedPart[];
  metadata: any;
}

/**
 * Custom DOCX serializer that maps TipTap node names to prosemirror-docx handlers
 * TipTap uses camelCase naming while prosemirror-docx uses snake_case
 */
const customDocxSerializer = new DocxSerializer(
  {
    ...defaultNodes,
    // Map TipTap camelCase node names to prosemirror-docx snake_case handlers
    paragraph(state, node) {
      console.log('[Serializer] Rendering paragraph');
      state.renderInline(node);
      state.closeBlock(node);
    },
    hardBreak(state) {
      state.addRunOptions({ break: 1 });
    },
    codeBlock(state, node) {
      state.renderContent(node);
      state.closeBlock(node);
    },
    horizontalRule(state, node) {
      state.closeBlock(node, { thematicBreak: true });
      state.closeBlock(node);
    },
    orderedList(state, node) {
      state.renderList(node, 'numbered');
    },
    bulletList(state, node) {
      state.renderList(node, 'bullets');
    },
    listItem(state, node) {
      state.renderListItem(node);
    },
  },
  defaultMarks
);

/**
 * Create a ProseMirror schema using TipTap extensions
 * This matches the actual structure used in the editor
 */
function createProseMirrorSchema(): Schema {
  // Use the same extensions as the prose editor
  const extensions = [
    StarterKit.configure({
      heading: false, // We'll add Heading explicitly
    }),
    Heading.configure({
      levels: [2, 3], // Match prose editor config
    }),
    Placeholder.configure({
      placeholder: '',
    }),
  ];

  return getSchema(extensions);
}

/**
 * Convert TipTap JSONContent to ProseMirror Node
 */
function createProseMirrorDoc(content: any, schema: Schema): ProseMirrorNode {
  return ProseMirrorNode.fromJSON(schema, content);
}

/**
 * Create a title page document
 */
function createTitlePageDoc(title: string, schema: Schema): ProseMirrorNode {
  return schema.node('doc', null, [
    schema.node('heading', { level: 2 }, [schema.text(title)]),
  ]);
}

/**
 * Create a chapter heading document
 */
function createChapterHeadingDoc(title: string, schema: Schema): ProseMirrorNode {
  return schema.node('doc', null, [
    schema.node('heading', { level: 2 }, [schema.text(title)]),
  ]);
}

/**
 * Merge multiple ProseMirror documents into one
 */
function mergeDocs(docs: ProseMirrorNode[], schema: Schema): ProseMirrorNode {
  const content: ProseMirrorNode[] = [];

  docs.forEach((doc, index) => {
    // Add all children from each doc
    doc.content.forEach((child) => {
      content.push(child);
    });

    // Add page break between docs (except after last one)
    if (index < docs.length - 1) {
      content.push(schema.node('paragraph'));
    }
  });

  return schema.node('doc', null, content);
}

/**
 * Export a merged story to DOCX format using prosemirror-docx
 * This runs in the Electron main process with full Node.js capabilities
 */
export async function exportToDocx(story: MergedStory): Promise<Buffer> {
  console.log('[DOCX Export] Starting export for story:', story.title);
  console.log('[DOCX Export] Number of parts:', story.parts.length);

  // Create ProseMirror schema
  const schema = createProseMirrorSchema();

  // Build the complete document
  const docs: ProseMirrorNode[] = [];

  // Add title page
  docs.push(createTitlePageDoc(story.title, schema));
  console.log('[DOCX Export] Added title page');

  // Add each chapter
  for (const part of story.parts) {
    console.log(`[DOCX Export] Processing part ${part.partIndex}: ${part.partTitle}`);
    console.log('[DOCX Export] Part content:', JSON.stringify(part.content).substring(0, 200));

    // Add chapter heading if there's a title
    if (part.partTitle) {
      docs.push(createChapterHeadingDoc(part.partTitle, schema));
    }

    // Add chapter content
    const partDoc = createProseMirrorDoc(part.content, schema);
    console.log('[DOCX Export] Part doc created, child count:', partDoc.childCount);
    docs.push(partDoc);
  }

  // Merge all documents
  const finalDoc = mergeDocs(docs, schema);
  console.log('[DOCX Export] Final doc child count:', finalDoc.childCount);

  // Serialize to DOCX using custom serializer
  console.log('[DOCX Export] Starting serialization...');
  console.log('[DOCX Export] First child type:', finalDoc.firstChild?.type.name);

  try {
    // Pass the document node to serialize
    const wordDocument = customDocxSerializer.serialize(
      finalDoc,
      {
        // No image handling needed for now
        getImageBuffer: (src: string): Uint8Array => {
          console.warn('[Export] Image export not yet implemented:', src);
          return new Uint8Array();
        },
      },
      (state) => {
        // This callback receives the serializer state and can return document options
        console.log('[DOCX Export] State callback - children count:', state.children?.length);
        console.log('[DOCX Export] State callback - sections count:', state.sections?.length);
        console.log('[DOCX Export] State callback - numbering count:', state.numbering?.length);

        // IMPORTANT: buildDoc expects either state.sections with content, or no sections at all
        // If state.sections is an empty array, buildDoc won't fall back to state.children
        // So we need to return a sections array with our content
        return {
          numbering: {
            config: state.numbering,
          },
          sections: [
            {
              properties: {},
              children: state.children,
            },
          ],
        };
      }
    );

    console.log('[DOCX Export] Serialization complete');
    console.log('[DOCX Export] Document object keys:', Object.keys(wordDocument));
    console.log('[DOCX Export] Document sections:', Array.isArray(wordDocument.sections) ? wordDocument.sections.length : 'not an array');

    // Try to access the actual sections data
    if (Array.isArray(wordDocument.sections)) {
      console.log('[DOCX Export] Section 0 keys:', Object.keys(wordDocument.sections[0] || {}));
      console.log('[DOCX Export] Section 0 children length:', wordDocument.sections[0]?.children?.length);
    }

    // Use Packer.toBuffer() in Node.js (works here, unlike browser)
    const buffer = await Packer.toBuffer(wordDocument);
    console.log('[DOCX Export] Buffer created, size:', buffer.length, 'bytes');
    return buffer;
  } catch (error) {
    console.error('[DOCX Export] Serialization failed:', error);
    throw error;
  }
}
