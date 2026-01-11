import StarterKit from '@tiptap/starter-kit'
import { renderToReactElement } from '@tiptap/static-renderer/pm/react'

renderToReactElement({
  extensions: [StarterKit], // using your extensions
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Hello World!',
          },
        ],
      },
    ],
  },
})
// returns a react node that, when evaluated, would be equivalent to: '<p>Hello World!</p>' without a Tiptap editor instance