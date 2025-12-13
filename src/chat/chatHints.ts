// src/chat/chatHints.ts
import { actions } from './actions';
import type { DocKindId, StoryDocKindId } from '../docs';
import type { MetaDocKey } from '../types/metaDoc';
import type { OpenWizardCommand } from '../wizards/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestionActionKind = 'prompt' | 'wizard' | 'navigate';

export type NavigateCommand =
  | {
      type: 'navigateToStorySection';
      section: StoryDocKindId;
    }
  | {
      type: 'navigateToManifest';
    };

export type SuggestionAction = {
  id: string;
  label: string;
  kind: SuggestionActionKind;

  /** For kind === 'prompt': text to send as a user prompt */
  prompt?: string;

  /** For kind === 'prompt': friendly version to display in chat bubble (if omitted, shows the actual prompt) */
  displayMessage?: string;

  /** For kind === 'wizard' or 'navigate': semantic command */
  command?: OpenWizardCommand | NavigateCommand;
};

export type AssistantHint = {
  /** Ephemeral "assistant" text shown when chat opens */
  introMessage: string;
  /** One or more suggested actions */
  actions: SuggestionAction[];
};

/**
 * Generic document state as seen from chat.
 * - 'missing'   → doc not created / no JSON in store
 * - 'empty'     → doc exists but has no (or only whitespace) content
 * - 'hasContent' → doc has non-empty content
 */
export type DocState = 'missing' | 'empty' | 'hasContent';

export type UpstreamStates = Partial<Record<MetaDocKey, DocState>>;

export type HintContext = {
  kind: DocKindId;
  targetState: DocState;
  upstream: UpstreamStates;
};

// ---------------------------------------------------------------------------
// Hint strategies per doc kind (extensible, optional)
// ---------------------------------------------------------------------------

type HintStrategy = (ctx: HintContext) => AssistantHint | null;

const proseHint: HintStrategy = (ctx) => {
  const { targetState, upstream } = ctx;
  const manifestState = upstream.manifest ?? 'missing';
  const briefState = upstream.brief ?? 'missing';
  const outlineState = upstream.outline ?? 'missing';

  const hasManifest = manifestState === 'hasContent';
  const hasBrief = briefState === 'hasContent';
  const hasOutline = outlineState === 'hasContent';

  const introParts: string[] = [];
  const suggestions: SuggestionAction[] = [];

  if (targetState === 'empty') {
    introParts.push('This is where you write your story.');

    if (!hasManifest) {
      introParts.push(
        'Before you start, consider creating a personal style guide that defines your voice, values, and writing style.'
      );
      suggestions.push(actions.writeManifest);
    } else {
      if (!hasBrief) {
        introParts.push(
          'Before you start writing, consider creating a brief (core idea, premise, themes).'
        );
        suggestions.push(actions.writeBrief);
      }
      if (!hasOutline && hasBrief) {
        introParts.push(
          'Before you dive in, consider creating an outline (plot structure, character arcs) to guide your writing.'
        );
        suggestions.push(actions.writeOutline);
      }
    }

    // still use test wizard for empty prose
    suggestions.push(actions.testWizard);
  } else if (targetState === 'hasContent') {
    introParts.push(
      `You're well underway with your story. I'm here to help with revisions, suggestions, or expanding your narrative.`
    );

    if (!hasManifest) {
      introParts.push(
        'However, it would be much easier to help if you had a personal style guide that defines your voice, values, and writing style.'
      );
      suggestions.push(actions.writeManifest);
    } else {
      if (!hasBrief) {
        introParts.push(
          "However, it would be easier for me to help you if you'd consider creating a brief (core idea, premise, themes)."
        );
        suggestions.push(actions.writeBrief);
      }
      if (!hasOutline && hasBrief) {
        introParts.push(
          'Although, before moving on, consider creating an outline (plot structure, character arcs) to guide your writing.'
        );
        suggestions.push(actions.writeOutline);
      }
    }
  } else {
    // targetState === 'missing' – usually we don't show anything
    return null;
  }

  return {
    introMessage: introParts.join(' '),
    actions: suggestions,
  };
};

const manifestHint: HintStrategy = (ctx) => {
  const { targetState } = ctx;

  if (targetState === 'empty') {
    return {
      introMessage:
        'This is where it all begins. Formulate your Author Manifest — a personal style guide that defines your voice, values, themes, and creative intentions.',
      actions: [actions.manifestStart],
    };
  }

  if (targetState === 'hasContent') {
    return {
      introMessage:
        'Make sure your manifest captures the essence of your storytelling—your voice, values, themes, and creative intentions.',
      actions: [actions.manifestGaps],
    };
  }

  return null;
};

const outlineHint: HintStrategy = (ctx) => {
  const { targetState, upstream } = ctx;
  const briefState = upstream.brief ?? 'missing';
  const hasBrief = briefState === 'hasContent';

  if (targetState === 'empty') {
    const suggestions: SuggestionAction[] = [];
    const introMessage =
      'This is where you plan your plot structure and sequence of events: character arcs, motivations, relationships, conflicts, turning points, and scene ordering.';

    if (!hasBrief) {
      suggestions.push(actions.writeBrief);
    }

    if (hasBrief) {
      suggestions.push(actions.outlineWizard);
    }

    return { introMessage, actions: suggestions };
  }

  if (targetState === 'hasContent') {
    return {
      introMessage:
        'Ask me about structure, pacing, plot gaps, or how to strengthen key turning points in your outline.',
      actions: [actions.outlineGaps],
    };
  }

  return null;
};

const briefHint: HintStrategy = (ctx) => {
  const { targetState } = ctx;

  if (targetState === 'empty') {
    return {
      introMessage:
        "This is where you define your story's core idea or concept: the central premise, themes, tone, and main character concepts. Start broad and refine as you go.",
      actions: [actions.briefIdeaShortStory],
    };
  }

  if (targetState === 'hasContent') {
    return {
      introMessage:
        'Make sure your brief sharply defines the premise, with a clear theme and angle.',
      actions: [actions.briefGaps],
    };
  }

  return null;
};

// Map from doc kind → strategy. Not all kinds need to be present.
const hintStrategies: Partial<Record<DocKindId, HintStrategy>> = {
  prose: proseHint,
  manifest: manifestHint,
  outline: outlineHint,
  brief: briefHint,
  // world, etc. can be added later
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decide what the chat should say/show when it first opens,
 * based on editor kind, target document state, and upstream document states.
 *
 * If there is no strategy for the given doc kind, returns null.
 */
export function getInitialAssistantHint(ctx: HintContext): AssistantHint | null {
  const strategy = hintStrategies[ctx.kind];
  if (!strategy) return null;
  return strategy(ctx);
}