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

  briefDrafter: {
    id: 'brief-drafter',
    label: {
      en: 'Create a draft brief',
      sv: 'Skapa ett brief-utkast',
    },
    kind: 'wizard',
    command: openWizard('brief-starter'),
  } satisfies SuggestionAction,

  writeOutline: {
    id: 'write-outline',
    label: {
      en: 'Write an outline',
      sv: 'Skriv en outline',
    },
    kind: 'navigate',
    command: {
      type: 'navigateToStorySection',
      section: 'outline',
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
      en: 'Suggest enhancements',
      sv: 'Föreslå förbättringar',
    },
    kind: 'prompt',
    prompt:
      'Please review the following Author Manifest and assess how well it expresses the author’s voice, values, themes, and creative principles. Identify strengths as well as areas that could be clarified or expanded. Keep the tone supportive and focus on how effectively the manifest communicates the author’s intended identity and storytelling approach. The audience is the author herself and an AI Assistant, not the public. It doesn\'t have to be personal or relatable. This is a tool, not an end product.',
    displayMessage: {
      en: 'Can you review my manifest and tell me how well it communicates my voice and values as an author?',
      sv: 'Kan du granska mitt manifest och säga hur väl det förmedlar min röst och mina värderingar som författare?',
    },
  } satisfies SuggestionAction,

  outlineGaps: {
    id: 'outline-gaps',
    label: {
      en: 'Suggest enhancements',
      sv: 'Föreslå förbättringar',
    },
    kind: 'prompt',
    prompt:
      'Please review and look for weak points in my outline: where is preparation, payoff, or clear conflict missing?',
    displayMessage: {
      en: 'Suggest enhancements and clarifications in my outline',
      sv: 'Föreslå förbättringar och förtydliganden i min outline',
    },
  } satisfies SuggestionAction,

  outlineHints: {
    id: 'outline-hints',
    label: {
      en: 'How do you write a good outline?',
      sv: 'Hur skriver man en bra outline?',
    },
    kind: 'prompt',
    prompt:
      'You are an editorial writing assistant. Explain, at a high and universal level, which components a story outline should consist of and how it should be structured to best support the writing process, using the author manifest and project brief only as contextual guidance for the type of story.\n\nThe outline should:\n– Be practical and usable as a working document\n– Reflect intended tone, scope, and constraints without referencing specific story details\n– Support narrative coherence, pacing, and thematic clarity\n\nDescribe the outline at a structural level (sections, hierarchy, and level of detail), not as story content. Use clear headings and concise bullet points. Assume separate documents exist for concept overview, characters, locations, and world description.\n\nConclude by acknowledging that stories do not all progress in the same way, briefly reference a few established narrative structures or methodologies (without going into detail), and ask whether the reader would like to explore or apply any of them to their story idea.',
    displayMessage: {
      en: 'Explain which components an outline should consist of and how it should be structured to support the writing process.',
      sv: 'Förklara vilka delar en outline ska bestå av och hur den struktureras för att stödja skrivprocessen.',
    },
  } satisfies SuggestionAction,
};