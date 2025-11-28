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
When answering:
{{#if hasSelection}}
- focus FULLY on the snippet
{{/if}}
{{#if hasSelection && fullTextMarkdown}}
- also keep the full text in mind
{{/if}}
{{#if !hasSelection && fullTextMarkdown}}
- focus on the full text
{{/if}}
{{#if manifestMarkdown}}
- and always keep the principles and guidelines of the manifest in mind
{{/if}}
