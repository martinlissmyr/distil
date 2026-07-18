/**
 * PDF Export Module
 *
 * Generates PDF files from merged story content using Electron's printToPDF API.
 * Uses a hidden BrowserWindow to render HTML with the compiled print CSS.
 */

import { BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { MergedStory } from '../../src/models/export';
import type { JSONContent } from '@tiptap/react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Export merged story to PDF file
 */
export async function exportToPdf(
  mergedStory: MergedStory,
  outputPath: string
): Promise<void> {
  let hiddenWindow: BrowserWindow | null = null;

  try {
    console.log('[PDF Export] Starting export to:', outputPath);

    // Create hidden browser window for rendering
    hiddenWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
      },
    });

    // Generate HTML content with embedded CSS
    const html = await generateStoryHTML(mergedStory);

    // Load HTML into window
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await hiddenWindow.loadURL(dataUrl);

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate PDF
    const pdfBuffer = await hiddenWindow.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 2.5,    // cm
        bottom: 2.5,
        left: 3,
        right: 3,
      },
      printBackground: false,
      landscape: false,
    });

    // Save to disk
    await fs.writeFile(outputPath, pdfBuffer);

  } catch (error) {
    console.error('[PDF Export] Error:', error);
    throw error;
  } finally {
    // Clean up window
    if (hiddenWindow) {
      hiddenWindow.destroy();
    }
  }
}

/**
 * Generate complete HTML document from merged story
 */
async function generateStoryHTML(mergedStory: MergedStory): Promise<string> {
  // Load compiled print CSS
  const cssPath = path.join(__dirname, 'pdfStyles.css');
  const css = await fs.readFile(cssPath, 'utf-8');

  // Generate parts HTML
  const partsHTML = mergedStory.parts
    .map(part => {
      const contentHTML = convertJSONContentToHTML(part.content);

      return `
        <div class="part">
          ${part.partTitle ? `<h1 class="partTitle">${escapeHTML(part.partTitle)}</h1>` : ''}
          <div class="content">
            ${contentHTML}
          </div>
        </div>
      `.trim();
    })
    .join('\n');

  // Complete HTML document
  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(mergedStory.title)}</title>
    <style>${css}</style>
  </head>
  <body>
    ${partsHTML}
  </body>
</html>`;
}

/**
 * Convert TipTap JSONContent to HTML
 * TODO: Implement proper conversion using TipTap's generateHTML or similar
 */
function convertJSONContentToHTML(content: JSONContent): string {
  if (!content || !content.content) {
    return '';
  }

  return content.content
    .map(node => nodeToHTML(node))
    .filter(Boolean)
    .join('\n');
}

/**
 * Convert a single ProseMirror node to HTML
 */
function nodeToHTML(node: JSONContent): string {
  if (!node.type) {
    return '';
  }

  switch (node.type) {
    case 'paragraph': {
      const pContent = node.content?.map(n => inlineNodeToHTML(n)).join('') || '';
      return `<p>${pContent}</p>`;
    }

    case 'heading': {
      const level = node.attrs?.level || 1;
      const hContent = node.content?.map(n => inlineNodeToHTML(n)).join('') || '';
      return `<h${level}>${hContent}</h${level}>`;
    }

    case 'bulletList': {
      const ulItems = node.content?.map(n => nodeToHTML(n)).join('\n') || '';
      return `<ul>\n${ulItems}\n</ul>`;
    }

    case 'orderedList': {
      const olItems = node.content?.map(n => nodeToHTML(n)).join('\n') || '';
      return `<ol>\n${olItems}\n</ol>`;
    }

    case 'listItem': {
      const liContent = node.content?.map(n => nodeToHTML(n)).join('\n') || '';
      return `<li>${liContent}</li>`;
    }

    case 'codeBlock': {
      const code = node.content?.map(n => n.text || '').join('\n') || '';
      return `<pre><code>${escapeHTML(code)}</code></pre>`;
    }

    case 'horizontalRule':
      return '<hr>';

    case 'hardBreak':
      return '<br>';

    default:
      console.warn('[PDF Export] Unknown node type:', node.type);
      return '';
  }
}

/**
 * Convert inline nodes (text, marks) to HTML
 */
function inlineNodeToHTML(node: JSONContent): string {
  if (node.type === 'text') {
    let html = escapeHTML(node.text || '');

    // Apply marks
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
          case 'strong':
            html = `<strong>${html}</strong>`;
            break;
          case 'italic':
          case 'em':
            html = `<em>${html}</em>`;
            break;
          case 'code':
            html = `<code>${html}</code>`;
            break;
          case 'link': {
            const href = mark.attrs?.href || '#';
            html = `<a href="${escapeHTML(href)}">${html}</a>`;
            break;
          }
        }
      }
    }

    return html;
  }

  // Handle other inline nodes
  return nodeToHTML(node);
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
