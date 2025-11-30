// src/chat/chatHints.ts
import type { EditorKind } from './buildPrompt';

export type SuggestionActionKind = 'prompt' | 'wizard' | 'navigate';

export type SuggestionAction = {
  id: string;
  label: string;
  kind: SuggestionActionKind;

  /** For kind === 'prompt': text to send as a user prompt */
  prompt?: string;

  /** For kind === 'prompt': friendly version to display in chat bubble (if omitted, shows the actual prompt) */
  displayMessage?: string;

  /** For kind === 'wizard' or 'navigate': semantic command */
  command?: {
    type: 'openWizard';
    wizard:
      | 'prose-starter'
      | 'outline-builder'
      | 'brief-helper'
      | 'manifest-helper'
      | 'test-wizard';
  } | {
    type: 'navigateToStorySection';
    section: 'prose' | 'outline' | 'brief';
  } | {
    type: 'navigateToManifest';
  };
};

export type AssistantHint = {
  /** Ephemeral "assistant" text shown when chat opens */
  introMessage: string;
  /** One or more suggested actions */
  actions: SuggestionAction[];
};

// ─────────────────────────────────────────────────────────────
// Reusable action definitions
// ─────────────────────────────────────────────────────────────

const ACTIONS = {
  writeManifest: {
    id: 'write-manifest',
    label: 'Write a manifest',
    kind: 'navigate' as const,
    command: { type: 'navigateToManifest' as const },
  },
  writeBrief: {
    id: 'write-brief',
    label: 'Write a brief',
    kind: 'navigate' as const,
    command: { type: 'navigateToStorySection' as const, section: 'brief' as const },
  },
  briefGaps: {
    id: 'brief-gaps',
    label: 'Analyse Brief',
    kind: 'prompt' as const,
    prompt:
      'Please analyze my brief. It is meant to provide conceptual guidance for later documents such as outlines, character sheets and worldbuilding dossiers. Please analyze the brief for missing elements, unclear concepts or contradictions. Focus on creative intention, thematic alignment, emotional goals, tone, core conflict and conceptual world direction—not plot details. Identify gaps that could hinder downstream development. Organize your feedback into: Missing Elements, Conceptual Weak Spots, Opportunities to Strengthen the Vision, and Clarifying Questions.',
    displayMessage: 'Can you look over this brief and tell me what’s missing or unclear?',
  },
  writeOutline: {
    id: 'write-outline',
    label: 'Write an outline',
    kind: 'navigate' as const,
    command: { type: 'navigateToStorySection' as const, section: 'outline' as const },
  },
  proseImproveParagraph: {
    id: 'prose-improve-paragraph',
    label: 'Polish a paragraph',
    kind: 'prompt' as const,
    prompt:
      'Improve the paragraph where the cursor is: make it clearer and more vivid without changing the meaning.',
    displayMessage: 'Polish a paragraph',
  },
  manifestStart: {
    id: 'manifest-start',
    label: 'Get started',
    kind: 'wizard' as const,
    command: { type: 'openWizard' as const, wizard: 'manifest-starter' as const },
  },
  manifestGaps: {
    id: 'manifest-gaps',
    label: 'Analyse the manifest',
    kind: 'prompt' as const,
    prompt:
      'Please review the following Author Manifest and assess how well it expresses the author’s voice, values, themes, and creative principles. Identify strengths as well as areas that could be clarified or expanded. Keep the tone supportive and focus on how effectively the manifest communicates the author’s intended identity and storytelling approach. The audience is the author herself and an AI Assistant, not the public.',
    displayMessage: 'Can you take a look at my manifest and tell me how well it communicates my voice and values?',
  },
  outlineWizard: {
    id: 'outline-wizard',
    label: 'Build an outline',
    kind: 'wizard' as const,
    command: { type: 'openWizard' as const, wizard: 'outline-builder' as const },
  },
  outlineGaps: {
    id: 'outline-gaps',
    label: 'Find weak points',
    kind: 'prompt' as const,
    prompt:
      'Look for weak points in my outline: where is preparation, payoff, or clear conflict missing?',
    displayMessage: 'Find weak points',
  },
  briefIdeaShortStory: {
    id: 'brief-idea-short-story',
    label: 'Generate a brief for a short story',
    kind: 'prompt' as const,
    prompt:
      'Generate a random idea for a short story, based on the concepts, ideals and values in the Author Manifest if available.',
    displayMessage: 'Generate a brief for a short story',
  },
  testWizard: {
    id: 'test-wizard',
    label: 'Launch Test Wizard',
    kind: 'wizard' as const,
    command: { type: 'openWizard' as const, wizard: 'test-wizard' as const },
  },
};

/**
 * Decide what the chat should say/show when it first opens,
 * based on editor kind, document state, and available metaDocs.
 */
export function getInitialAssistantHint(params: {
  kind: EditorKind;
  isEmpty: boolean;
  hasBrief?: boolean;
  hasOutline?: boolean;
  hasManifest?: boolean;
}): AssistantHint | null {
  const { kind, isEmpty, hasBrief, hasOutline, hasManifest } = params;

  const message: AssistantHint = {
    introMessage: '',
    actions: [],
  };

  if (kind === 'prose') {
    if (isEmpty) {
      message.introMessage = `This is where you write your story.`;

      if (!hasManifest) {
        message.introMessage += " Before you start, consider creating a personal style guide that defines your voice, values, and writing style.";
        message.actions.push(ACTIONS.writeManifest);
      } else {
        if (!hasBrief) {
          message.introMessage += " Before you start writing, consider creating a brief (core idea, premise, themes).";
          message.actions.push(ACTIONS.writeBrief);
        }
        if (!hasOutline) {
          if (hasBrief) {
            message.introMessage += " Before you start, consider creating an outline (plot structure, character arcs) to guide your writing."
            message.actions.push(ACTIONS.writeOutline);
          }
        }
      }

      // Add test wizard as an option for empty prose
      message.actions.push(ACTIONS.testWizard);
    } else {
      message.introMessage = `You're well underway with your story. I'm here to help with revisions, suggestions, or expanding your narrative.`;

      if (!hasManifest) {
        message.introMessage += " However, it would be much easier to help if you had a personal style guide that defines your voice, values, and writing style.";
        message.actions.push(ACTIONS.writeManifest);
      } else {
        if (!hasBrief) {
          message.introMessage += " However, it would be easier for me to help you if you'd consider creating a brief (core idea, premise, themes).";
          message.actions.push(ACTIONS.writeBrief);
        }
        if (!hasOutline) {
          if (hasBrief) {
            message.introMessage += " Although, before moving on, consider creating an outline (plot structure, character arcs) to guide your writing."
            message.actions.push(ACTIONS.writeOutline);
          }
        }
      }
    }
  }

  if (kind === 'manifest') {
    if (isEmpty) {
      message.introMessage =
        'This is where it all begins. Formulate your Author Manifest — a personal style guide that defines your voice, values, themes, and creative intentions';

      message.actions.push(ACTIONS.manifestStart);
    } else {
      message.introMessage =
        'Make sure your manifest captures the essence of your storytelling—your voice, values, themes, and creative intentions.';
      message.actions.push(ACTIONS.manifestGaps);
    }
  }

  if (kind === 'outline') {
    if (isEmpty) {
      message.introMessage =
        'This is where you plan your plot structure and sequence of events: character arcs, motivations, relationships, conflicts, turning points, and scene ordering.';

      if (!hasBrief) {
        message.actions.push(ACTIONS.writeBrief);
      }

      if (hasBrief) {
        message.actions.push(ACTIONS.outlineWizard);
      }
    } else {
      message.introMessage =
        'Ask me about structure, pacing, plot gaps, or how to strengthen key turning points in your outline.';

      message.actions.push(ACTIONS.outlineGaps);
    }
  }

  if (kind === 'brief') {
    if (isEmpty) {
      message.introMessage =
        'This is where you define your story\'s core idea or concept: the central premise, themes, tone, and main character concepts. Start broad and refine as you go.';

      message.actions.push(ACTIONS.briefIdeaShortStory);
    } else {
      message.introMessage =
        'Make sure your brief sharply defines the premise, with clear a theme and angle.';
      message.actions.push(ACTIONS.briefGaps);
    }
  }

  return message;
}