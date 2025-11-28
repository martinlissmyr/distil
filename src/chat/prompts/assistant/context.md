Context for this conversation:

ARTIFACT TITLE:
{{title}}
{{#if fullTextMarkdown}}

FULL TEXT (may be partial):
---
{{fullTextMarkdown}}
---
{{/if}}
{{contextDocumentsMarkdown}}
{{#if hasSelection}}

SNIPPET (current selection):
---
{{selectionMarkdown}}
---
{{/if}}

When answering:
{{#if hasSelection}}- focus FULLY on the snippet{{/if}}
{{#if hasSelection && fullTextMarkdown}}- also keep the full text in mind{{/if}}
{{#if !hasSelection && fullTextMarkdown}}- focus on the full text{{/if}}
{{#if contextDocumentsMarkdown}}- keep all provided context documents in mind when crafting your response{{/if}}
