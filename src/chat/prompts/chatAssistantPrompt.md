Context for this conversation:

{{#if fullTextMarkdown}}

FULL MAIN TEXT ({{title}}):
---
{{fullTextMarkdown}}
---
{{/if}}
{{#if hasSelection}}

SNIPPET (current selection):
---
{{selectionMarkdown}}
---
{{/if}}
{{contextDocumentsMarkdown}}

When answering:
{{#if hasSelection}}- focus FULLY on the snippet{{/if}}{{#if hasSelection && fullTextMarkdown}} but use the full main text as context{{/if}}
{{#if !hasSelection && fullTextMarkdown}}- focus on the full main text{{/if}}
{{#if contextDocumentsMarkdown}}- keep all provided context documents in mind when crafting your response{{/if}}
