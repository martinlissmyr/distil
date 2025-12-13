// src/chat/actions/index.ts
import type { SuggestionAction } from '../chatHints';
import type { WizardId, OpenWizardCommand } from '../../wizards/types';

// Small helper so we only encode the "openWizard" shape in one place
function openWizard(wizardId: WizardId): OpenWizardCommand {
  return { type: 'openWizard', wizardId };
}

// ---------------------------------------------------------------------------
// Reusable action definitions
// ---------------------------------------------------------------------------

export const actions = {
  writeManifest: {
    id: 'write-manifest',
    label: 'Write a manifest',
    kind: 'navigate',
    command: { type: 'navigateToManifest' },
  } satisfies SuggestionAction,

  writeBrief: {
    id: 'write-brief',
    label: 'Write a brief',
    kind: 'navigate',
    command: {
      type: 'navigateToStorySection',
      section: 'brief',
    },
  } satisfies SuggestionAction,

  briefGaps: {
    id: 'brief-gaps',
    label: 'Analyse Brief',
    kind: 'prompt',
    prompt:
      'Please analyze my brief. It is meant to provide conceptual guidance for later documents such as outlines, character sheets and worldbuilding dossiers. Please analyze the brief for missing elements, unclear concepts or contradictions. Focus on creative intention, thematic alignment, emotional goals, tone, core conflict and conceptual world direction—not plot details. Identify gaps that could hinder downstream development. Organize your feedback into: Missing Elements, Conceptual Weak Spots, Opportunities to Strengthen the Vision, and Clarifying Questions.',
    displayMessage:
      'Can you look over this brief and tell me what’s missing or unclear?',
  } satisfies SuggestionAction,

  writeOutline: {
    id: 'write-outline',
    label: 'Write an outline',
    kind: 'navigate',
    command: {
      type: 'navigateToStorySection',
      section: 'outline',
    },
  } satisfies SuggestionAction,

  proseImproveParagraph: {
    id: 'prose-improve-paragraph',
    label: 'Polish a paragraph',
    kind: 'prompt',
    prompt:
      'Improve the paragraph where the cursor is: make it clearer and more vivid without changing the meaning.',
    displayMessage: 'Polish a paragraph',
  } satisfies SuggestionAction,

  manifestStart: {
    id: 'manifest-start',
    label: 'Get started',
    kind: 'wizard',
    command: openWizard('manifest-starter'),
  } satisfies SuggestionAction,

  manifestGaps: {
    id: 'manifest-gaps',
    label: 'Analyse the manifest',
    kind: 'prompt',
    prompt:
      'Please review the following Author Manifest and assess how well it expresses the author’s voice, values, themes, and creative principles. Identify strengths as well as areas that could be clarified or expanded. Keep the tone supportive and focus on how effectively the manifest communicates the author’s intended identity and storytelling approach. The audience is the author herself and an AI Assistant, not the public.',
    displayMessage:
      'Can you take a look at my manifest and tell me how well it communicates my voice and values?',
  } satisfies SuggestionAction,

  outlineWizard: {
    id: 'outline-wizard',
    label: 'Build an outline',
    kind: 'wizard',
    command: openWizard('outline-builder'),
  } satisfies SuggestionAction,

  outlineGaps: {
    id: 'outline-gaps',
    label: 'Find weak points',
    kind: 'prompt',
    prompt:
      'Look for weak points in my outline: where is preparation, payoff, or clear conflict missing?',
    displayMessage: 'Find weak points',
  } satisfies SuggestionAction,

  briefIdeaShortStory: {
    id: 'brief-idea-short-story',
    label: 'Generate a brief for a short story',
    kind: 'prompt',
    prompt:
      'Generate a random idea for a short story, based on the concepts, ideals and values in the Author Manifest if available.',
    displayMessage: 'Generate a brief for a short story',
  } satisfies SuggestionAction,

  testWizard: {
    id: 'test-wizard',
    label: 'Launch Test Wizard',
    kind: 'wizard',
    command: openWizard('test-wizard'),
  } satisfies SuggestionAction,
};