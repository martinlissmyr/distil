{{#if !selfHasContent}}
Här skriver du din berättelse.

{{#if !hasContent(manifest)}}
Innan du börjar kan du skapa ett författarmanifest — en personlig stilguide som beskriver din röst, dina värderingar och din skrivstil.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Innan du börjar skriva kan du skapa en brief (kärnidén, premiss, teman).
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Innan du dyker in kan du skapa en disposition/outline (struktur, karaktärsbågar) som stöd i skrivandet.
{{/if}}
{{/if}}

{{#if selfHasContent}}
Du är redan igång med din berättelse. Jag kan hjälpa till med revisioner, förslag och att utveckla din text.

{{#if !hasContent(manifest)}}
Det blir dock mycket lättare för mig att hjälpa dig om du har ett författarmanifest som beskriver din röst, dina värderingar, teman och skrivstil.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Det blir också lättare att hjälpa dig om du skapar en brief (kärnidén, premiss, teman).
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Innan du går vidare kan du även skapa en disposition/outline (struktur, karaktärsbågar) för att guida skrivandet.
{{/if}}
{{/if}}