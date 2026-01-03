Context for this conversation:

{{#if currentContent}}

CURRENT TEXT:
---
{{currentContent}}
---
{{/if}}

{{contextDocumentsMarkdown}}

When answering:
{{#if currentContent}}- make sure to integrate the current text in your response{{/if}}
{{#if contextDocumentsMarkdown}}- keep all provided context documents in mind when crafting your response{{/if}}
