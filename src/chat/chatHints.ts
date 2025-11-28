// src/chat/chatHints.ts
import type { EditorKind } from './buildPrompt';

export type SuggestionActionKind = 'prompt' | 'wizard' | 'navigate';

export type SuggestionAction = {
  id: string;
  label: string;
  kind: SuggestionActionKind;

  /** For kind === 'prompt': text to send as a user prompt */
  prompt?: string;

  /** For kind === 'wizard' or 'navigate': semantic command */
  command?: {
    type: 'openWizard';
    wizard:
      | 'prose-starter'
      | 'outline-builder'
      | 'brief-helper'
      | 'manifest-helper';
  } | {
    type: 'navigate';
    target: 'prose' | 'outline' | 'brief' | 'manifest';
  };
};

export type AssistantHint = {
  /** Ephemeral “assistant” text shown when chat opens */
  introMessage: string;
  /** One or more suggested actions */
  actions: SuggestionAction[];
};

/**
 * Decide what the chat should say/show when it first opens,
 * based on editor kind and whether the doc is empty.
 */
export function getInitialAssistantHint(params: {
  kind: EditorKind;
  isEmpty: boolean;
}): AssistantHint | null {
  const { kind, isEmpty } = params;

  if (kind === 'prose') {
    if (isEmpty) {
      return {
        introMessage:
          `This is where it all begins. Don't know where to start? Have you written your brief yet?`,
        actions: [
          {
            id: 'write-brief',
            label: 'Write your brief',
            kind: 'navigate',
            command: { type: 'navigate', target: 'brief' },
          },
        ],
      };
    }

    return {
      introMessage:
        `You are already well underway on your story. Don't hesitate to ask me for help…`,
      actions: [
        {
          id: 'prose-improve-paragraph',
          label: 'Putsa ett stycke',
          kind: 'prompt',
          prompt:
            'Förbättra stycket där markören står: gör det tydligare och mer levande, utan att ändra betydelsen.',
        },
      ],
    };
  }

  if (kind === 'manifest') {
    if (isEmpty) {
      return {
        introMessage:
          'Här kan du ta fram en författarmanifest. Vi kan börja med din röst, dina värden och vad du vill att AI:n ska förstå.',
        actions: [
          {
            id: 'manifest-start',
            label: 'Starta manifestet',
            kind: 'prompt',
            prompt:
              'Hjälp mig skissa fram ett första utkast till ett författarmanifest. Börja med att ställa några frågor om min röst och vad jag vill uppnå.',
          },
        ],
      };
    }

    return {
      introMessage:
        'Du kan be mig skärpa, strukturera eller komprimera manifestet – så att det blir lätt att återanvända som instruktion.',
      actions: [
        {
          id: 'manifest-tighten',
          label: 'Skärp manifestet',
          kind: 'prompt',
          prompt:
            'Hjälp mig göra detta manifest mer koncentrerat och användbart som instruktion till en AI-författare.',
        },
      ],
    };
  }

  if (kind === 'outline') {
    if (isEmpty) {
      return {
        introMessage:
          'Det här sidofältet kan hjälpa dig bygga en outline: struktur, scener och bågar.',
        actions: [
          {
            id: 'outline-wizard',
            label: 'Bygg en outline',
            kind: 'wizard',
            command: { type: 'openWizard', wizard: 'outline-builder' },
          },
        ],
      };
    }

    return {
      introMessage:
        'Fråga om struktur, tempo, luckor eller hur du kan stärka vissa vändpunkter.',
      actions: [
        {
          id: 'outline-gaps',
          label: 'Hitta svaga punkter',
          kind: 'prompt',
          prompt:
            'Leta efter svaga punkter i min outline: var saknas förberedelse, payoff eller tydlig konflikt?',
        },
      ],
    };
  }

  if (kind === 'brief') {
    if (isEmpty) {
      return {
        introMessage:
          `This is where you shape the core idea: premise, theme, and hook. You can start broad and refine it as you go along.

Start writing, talk to me or get started quickly with one of these actions:`,
        actions: [
          {
            id: 'brief-idea-short-story',
            label: 'Generate a brief for a short story',
            kind: 'prompt',
            prompt:
              'Generate a random idea for a short story, base it on the concepts, ideals and values in the Author Manifest if available.',
          },
        ],
      };
    }

    return {
      introMessage:
        'This is where you shape the core idea: premise, theme, and hook. Let me help you develop the brief further.',
      actions: [
        {
          id: 'brief-loglines',
          label: 'Skriv loglines',
          kind: 'prompt',
          prompt:
            'Föreslå 5 olika loglines utifrån den här briefen. Variera ton och fokus lite.',
        },
      ],
    };
  }

  // Fallback
  return null;
}