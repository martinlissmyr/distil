// src/chat/actions/index.ts
import type { SuggestionAction } from '../chatHints';
import type { WizardId, OpenWizardCommand } from '../../wizards/types';

// Small helper so we only encode the "openWizard" shape in one place
function openWizard(wizardId: WizardId): OpenWizardCommand {
  return { type: 'openWizard', wizardId };
}

export const actions = {
  writeManifest: {
    id: 'write-manifest',
    label: {
      en: 'Write a manifest',
      sv: 'Skriv ett manifest',
    },
    kind: 'navigate',
    command: { type: 'navigateToManifest' },
  } satisfies SuggestionAction,

  writeBrief: {
    id: 'write-brief',
    label: {
      en: 'Write a brief',
      sv: 'Skriv en brief',
    },
    kind: 'navigate',
    command: {
      type: 'navigateToStorySection',
      section: 'brief',
    },
  } satisfies SuggestionAction,

  briefGaps: {
    id: 'brief-gaps',
    label: {
      en: 'Suggest enhancements',
      sv: 'Föreslå förbättringar',
    },
    kind: 'prompt',
    prompt:
      'Please analyze my brief. It is meant to provide conceptual guidance for later documents such as outlines, character sheets and worldbuilding dossiers. Please analyze the brief for missing elements, unclear concepts or contradictions. Focus on creative intention, thematic alignment, emotional goals, tone, core conflict and conceptual world direction—not plot details. Identify gaps that could hinder downstream development. Organize your feedback into: Missing Elements, Conceptual Weak Spots, Opportunities to Strengthen the Vision, and Clarifying Questions.',
    displayMessage: {
      en: 'Can you look over this brief and tell me what’s missing or unclear?',
      sv: 'Kan du titta igenom min brief och säga vad som saknas eller är oklart?',
    },
  } satisfies SuggestionAction,

  writeOutline: {
    id: 'write-outline',
    label: {
      en: 'Write an outline',
      sv: 'Skriv en disposition',
    },
    kind: 'navigate',
    command: {
      type: 'navigateToStorySection',
      section: 'outline',
    },
  } satisfies SuggestionAction,

  proseImproveParagraph: {
    id: 'prose-improve-paragraph',
    label: {
      en: 'Polish a paragraph',
      sv: 'Putsa ett stycke',
    },
    kind: 'prompt',
    prompt:
      'Improve the paragraph where the cursor is: make it clearer and more vivid without changing the meaning.',
    displayMessage: {
      en: 'Polish this paragraph',
      sv: 'Putsa det här stycket',
    },
  } satisfies SuggestionAction,

  manifestStart: {
    id: 'manifest-start',
    label: {
      en: 'Get started',
      sv: 'Kom igång',
    },
    kind: 'wizard',
    command: openWizard('manifest-starter'),
  } satisfies SuggestionAction,

  manifestGaps: {
    id: 'manifest-gaps',
    label: {
      en: 'Analyse the manifest',
      sv: 'Analysera manifestet',
    },
    kind: 'prompt',
    prompt:
      'Please review the following Author Manifest and assess how well it expresses the author’s voice, values, themes, and creative principles. Identify strengths as well as areas that could be clarified or expanded. Keep the tone supportive and focus on how effectively the manifest communicates the author’s intended identity and storytelling approach. The audience is the author herself and an AI Assistant, not the public.',
    displayMessage: {
      en: 'Can you review my manifest and tell me how well it communicates my voice and values?',
      sv: 'Kan du granska mitt manifest och säga hur väl det förmedlar min röst och mina värderingar?',
    },
  } satisfies SuggestionAction,

  outlineWizard: {
    id: 'outline-wizard',
    label: {
      en: 'Build an outline',
      sv: 'Bygg en disposition',
    },
    kind: 'wizard',
    command: openWizard('outline-builder'),
  } satisfies SuggestionAction,

  outlineGaps: {
    id: 'outline-gaps',
    label: {
      en: 'Find weak points',
      sv: 'Hitta svagheter',
    },
    kind: 'prompt',
    prompt:
      'Look for weak points in my outline: where is preparation, payoff, or clear conflict missing?',
    displayMessage: {
      en: 'Find weak points in my outline',
      sv: 'Hitta svagheter i min disposition',
    },
  } satisfies SuggestionAction,

  briefIdeaShortStory: {
    id: 'brief-idea-short-story',
    label: {
      en: 'Generate a short story brief',
      sv: 'Skapa en novell-brief',
    },
    kind: 'prompt',
    prompt:
      'Generate a random idea for a short story, based on the concepts, ideals and values in the Author Manifest.',
    displayMessage: {
      en: 'Generate a brief for a short story based on my author manifest',
      sv: 'Skapa en brief för en novell baserat på mitt författarmanifest',
    },
  } satisfies SuggestionAction,

  testWizard: {
    id: 'test-wizard',
    label: {
      en: 'Launch test wizard',
      sv: 'Starta testguide',
    },
    kind: 'wizard',
    command: openWizard('test-wizard'),
  } satisfies SuggestionAction,
};