{{#if !selfHasContent}}
Det är här du skriver du din berättelse.

{{#if !hasContent(manifest)}}
Innan du börjar är det starkt rekommenderat att du skapat ett författarmanifest — en personlig stilguide som beskriver din röst, dina värderingar och din stil som författare.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Innan du börjar skriva är det en god idé att skapa en brief där du beskriver kärnidé, premiss och teman.
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Innan du börjar är det effektivt att skapa en outline där du beskriver berättelsens struktur och framåtrörelse. Denna fungerar sedan som ett effektivt stöd i skrivandet.
{{/if}}
{{/if}}

{{#if selfHasContent}}
Jag kan hjälpa till med revisioner, förslag och utveckling av din text.

{{#if !hasContent(manifest)}}Jag rekommenderar dock att du först formulerar ett författarmanifest där du beskriver din röst, värderingar och stil.
{{/if}}

{{#if hasContent(manifest) && !hasContent(brief)}}
Det blir dock lättare att hjälpa dig om du först skapar en brief för din text där du förklarar kärnidé, premiss och teman.
{{/if}}

{{#if hasContent(manifest) && hasContent(brief) && !hasContent(outline)}}
Innan du går vidare kan det vara hjälpsamt att skapa en disposition eller outline som beskriver berättelsens struktur, karaktärsbågar och utveckling.
{{/if}}
{{/if}}