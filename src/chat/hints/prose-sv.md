{{#if !selfHasContent}}
Det är här du skriver du din berättelse.

{{#if !hasContent(manifest)}}
Innan du börjar kan du skapa ett författarmanifest — en personlig stilguide som beskriver din röst, dina värderingar och din skrivstil.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Innan du börjar skriva kan du skapa en brief (kärnidén, premiss, teman).
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Innan du börjar kan du skapa en outline där du beskriver berättelsens struktur, karaktärsbågar och progression som stöd i skrivandet.
{{/if}}
{{/if}}

{{#if selfHasContent}}
Jag kan hjälpa till med revisioner, förslag och utveckling av din text.

{{#if !hasContent(manifest)}}Jag rekommenderar dock att du först formulerat ett författarmanifest som beskriver din röst, värderingar och stil.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Det blir dock lättare att hjälpa dig om du först skapar en brief för din text där du förklarar kärnidé, premiss och teman.
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Innan du går vidare kan du skapa en disposition/outline fär du beskriver berättelsens struktur, karaktärsbågar och progression.
{{/if}}
{{/if}}