{{#if !selfHasContent}}
This is where you write your story.

{{#if !hasContent(manifest)}}
Before you start, consider creating a personal style guide that defines your voice, values, and writing style.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Before you start writing, consider creating a brief (core idea, premise, themes).
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Before you dive in, consider creating an outline (plot structure, character arcs) to guide your writing.
{{/if}}
{{/if}}

{{#if selfHasContent}}
You're well underway with your story. I'm here to help with revisions, suggestions, or expanding your narrative.

{{#if !hasContent(manifest)}}
However, it would be much easier to help if you had a personal style guide that defines your voice, values, themes, and writing style.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
However, it would be easier for me to help you if you'd consider creating a brief (core idea, premise, themes).
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Although, before moving on, consider creating an outline (plot structure, character arcs) to guide your writing.
{{/if}}
{{/if}}