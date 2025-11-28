Context for this conversation:

ARTIFACT TITLE:
{{title}}
{{#if fullTextMarkdown}}

FULL TEXT (may be partial):
---
{{fullTextMarkdown}}
---
{{/if}}
{{#if manifestMarkdown}}

AUTHOR MANIFEST (style/tone):
---
{{manifestMarkdown}}
---
{{/if}}
{{#if hasSelection}}

SNIPPET (current selection):
---
{{selectionMarkdown}}
---
When answering, focus FULLY on the snippet, but keep the full text and manifest in mind.
{{/if}}
