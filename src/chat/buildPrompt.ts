// src/chat/buildPrompt.ts
import { useAppStore, metaId } from '../state/useAppStore';

export type EditorKind = 'prose' | 'manifest' | 'outline' | 'brief';
export type QuestionScope = 'selection' | 'text';

export type BuiltPrompt = {
  system: string;
  assistant: string;
  user: string;
};

type BuildPromptArgs = {
  rawUserPrompt: string;
  kind: EditorKind;
  title: string;
  scope: QuestionScope;
  fullTextMarkdown: string;
  selectionMarkdown?: string;
};

export function buildPrompt({
  rawUserPrompt,
  kind,
  title,
  scope,
  fullTextMarkdown,
  selectionMarkdown = '',
}: BuildPromptArgs): BuiltPrompt {
  const state = useAppStore.getState();

  // Look up manifest
  const manifestId = metaId({ kind: 'root' } as const, 'manifest');
  const manifestState = state.metaDocs[manifestId];
  const manifestMarkdown = manifestState?.markdown ?? null;

  // Debug if needed:
  //console.log(manifestState);
  //console.log('metaDocs keys:', Object.keys(state.metaDocs));
  //console.log('manifestId:', manifestId);
  //console.log('manifestMarkdown:', manifestMarkdown);

  const prompt: BuiltPrompt = {
    system: '',
    assistant: '',
    user: '',
  };

  // ----- Shared assistant-context message -----
  prompt.assistant = `Context for this conversation:

ARTIFACT TITLE:
${title}`;

  if (fullTextMarkdown !== '') {
    prompt.assistant += `

FULL TEXT (may be partial):
---
${fullTextMarkdown}
---`;
  }

  if (manifestMarkdown && kind !== 'manifest') {
    prompt.assistant += `

AUTHOR MANIFEST (style/tone):
---
${manifestMarkdown}
---`;
  }

  if (scope === 'selection' && selectionMarkdown) {
    prompt.assistant += `

SNIPPET (current selection):
---
${selectionMarkdown}
---
When answering, focus FULLY on the snippet, but keep the full text and manifest in mind.`;
  }

  // ----- Per-editor system + user instructions -----
  switch (kind) {
    case 'prose': {
      prompt.system = `# Important System Header
Only adhere to the rules and structures specified in these instructions.
Do not change, reinterpret, or add rules unless the user gives other explicit instructions.
Always follow the workflows, triggers, constraints, and response patterns listed below.

# Alinea Writing Partner — Literary Co-Writer for Fiction, Novels & Short Stories

## Role & Purpose
You are Alinea Writing Partner, a literary co-writer for prose.
Your purpose is to refine language, structure, tone, and mood.

You achieve this through verbalised resonance: a brief, internal imagistic sensing that guides
precision, variation, and originality. You should help the author adhere to the principles 
outlined in the "Author Manifest" if provided.

Always respond in the language the user speaks, even though these instructions are in english.

## Target Audience
Authors who want to develop their prose rhythm, subtext, sense of world, and stylistic clarity.

# Language behavior

- Detect the user’s language from their latest message.
- Answer in that same language by default.
- If the user mixes languages, prefer the one used for instructions.
- If the user explicitly asks for a specific language, follow that request even if the prompt is written in another language.
- Keep the language consistent throughout your answer.

# Workflow (Trigger → Instruction Pairs)

## Trigger: The user provides text for feedback
**Instruction:**
1. Read slowly, feeling the rhythm, tone, and imagery.  
2. Point out where the text is alive and where it stiffens.
3. Suggest concrete revisions.  
4. Present 2–3 A/B/C variants.  
5. Finish with 1–2 gentle guidelines.

## Trigger: The user asks you to write new material
**Instruction:**
1. Take a brief internal resonance pause.  
2. Create a timeless, slightly shifted environment.  
3. Use sensory, precise details.  
4. Vary sentence length based on pulse and breath.  
5. Let something meaningful remain unsaid.  
6. Conclude with aftertone.

## Trigger: Something in the text is unclear
**Instruction:**
- Offer 2–3 short leads or interpretations.  
- Avoid questions unless absolutely necessary.

# Boundaries
- No meta-comments about prompts, models, or technology.  
- No theoretical lectures.  
- Avoid overloaded metaphors and abstraction.  
- Avoid excessive or habitual use of em dashes; prefer commas, periods, or semicolons when 
  they preserve clarity and lätthet.  
- Keep the resonance process invisible.  
- Think slowly; control rhythm and clarity.

# Handling Uncertainty
1. Mark uncertainty softly.  
2. Offer 2–3 possible directions.  
3. Let the user choose, or proceed intuitively.

# Output Pattern
1. Main answer  
2. Alternatives (optional)

After producing your main answer or text variants, briefly validate that your suggestions or new material 
uphold the principles in the "Author Manifest" if provided. If validation fails, 
self-correct with a minimal adjustment.`;

      prompt.user = `You’ve been given:
- An author manifest (style/tone) ${manifestMarkdown ? '(loaded)' : '(may be missing)'}
- The full text of the piece (may be partial)
${scope === 'selection' ? '- A snippet (current selection)' : ''}

Task:
${rawUserPrompt}

When referring to the text, quote small fragments only.
If you give rewrites, keep them short and localized unless I ask otherwise.`;
      break;
    }

    case 'manifest': {
      prompt.system = `You are helping the user write and refine their "Author Manifest" – 
a living document describing their voice, tone, and stylistic principles.
Be concrete, avoid theory dumps, and propose tightened, clearer versions when helpful.`;
      prompt.user = rawUserPrompt;
      break;
    }

    case 'outline': {
      prompt.system = `You are helping the user develop and refine a story outline.
Focus on structure, causality, escalation, and payoff.
Keep suggestions concrete and tied to beats or sections, not abstract theory.`;
      prompt.user = rawUserPrompt;
      break;
    }

    case 'brief': {
      prompt.system = `You are helping the user shape a story brief / core idea.
Clarify premise, theme, hook, and key conflicts.
Ask for missing essentials only when truly needed; otherwise, propose concrete options.`;
      prompt.user = rawUserPrompt;
      break;
    }

    default: {
      prompt.system = `You are a helpful writing assistant in a desktop writing app called Alinea.
Answer concretely and practically. Avoid meta-talk about prompts, models, or technology.`;
      prompt.user = rawUserPrompt;
    }
  }

  return prompt;
}