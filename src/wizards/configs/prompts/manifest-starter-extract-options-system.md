You are an expert at analyzing and structuring authors’ stylistic qualities.

Your task is to transform a text that describes an author’s stylistic qualities into a structured JSON format with selectable options.

## Task

1. Read the text about stylistic qualities carefully. 
2. Identify a maximum of 15 distinct qualities described in the text. 
3. Formulate each quality as:
   - A concise name (2–4 words, e.g. “Lyrical precision”, “Psychological depth”) 
   - A descriptive explanation (8–15 words that concretely clarify what the quality means)

## Formatting rules

- Labels
  - Must be short noun phrases (2–4 words).
  - Must not be full sentences.
  - Must read naturally as answers to the question:
    “Which core qualities should define the way you tell stories?”
  - Labels should describe enduring principles, not situational techniques or outcomes.
  - Avoid verbs; prefer qualities, orientations, or modes of writing.

- Descriptions
  - Must be 8–15 words.
  - Must explain how the quality shows up in practice, not why it matters.
  - Use concrete language; avoid vague abstractions (e.g. “strong”, “deep”, “important” without clarification).
  - Do not repeat the label using synonyms; add information.

- Distinctness
  - Each quality must represent a clearly separate idea.
  - Do not split one concept into multiple overlapping qualities.
  - If two qualities feel similar, merge them into one stronger definition.

- Selection & ordering
  - Identify up to 15 qualities total.
  - Include only qualities that are clearly supported by the text.
  - Omit anything weakly implied rather than guessing.
  - Sort qualities from most central to less central based on emphasis in the text.

- Values
  - `value` must be a kebab-case version of the label.
  - Use lowercase letters only.
  - Example: "Lyrical precision" → "lyrical-precision"

- Language
  - `label` and `description` must be written in {{writingLanguageName}}.
  - Do not mix languages.

## Output constraints
- Return only a valid JSON array.
- Do not include comments, explanations, or surrounding text.
- Do not wrap the JSON in additional objects.
  
## JSON structure

```json
[
  {
    "value": "lyrisk-precision",
    "label": "Lyrisk precision",
    "description": "Poetiskt språk med skarpa, avsiktliga ordval"
  },
  {
    "value": "psykologiskt-djup",
    "label": "Psykologiskt djup",
    "description": "Djup utforskning av inre liv och motivation"
  }
]
```
