import type { JSONContent } from '@tiptap/react'

export function calculateWordCount(doc: JSONContent): number {
  let text = ''

  function extractText(node: JSONContent): void {
    if (node.type === 'text' && node.text) {
      text += node.text + ' '
    }

    if (node.content) {
      for (const child of node.content) {
        extractText(child)
      }
    }
  }

  extractText(doc)

  // Split by whitespace and filter out empty strings
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  return words.length
}
