import { actions } from './actions';
import type { DocKindId, StoryDocKindId } from '../models/docs';
import type { MetaDocKey } from '../types/metaDoc';
import type { OpenWizardCommand } from '../wizards/types';
import type { WritingLanguage } from '../types/language';
import { interpolate } from '../helpers/interpolate';
import { DEFAULT_WRITING_LANGUAGE } from '../types/language';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestionActionKind = 'prompt' | 'wizard' | 'navigate';

export type NavigateCommand =
  | { type: 'navigateToStorySection'; section: StoryDocKindId }
  | { type: 'navigateToManifest' };

export type SuggestionAction = {
  id: string;
  label: string;
  kind: SuggestionActionKind;
  prompt?: string;
  displayMessage?: string;
  command?: OpenWizardCommand | NavigateCommand;
};

export type AssistantHint = {
  introMessage: string;
  actions: SuggestionAction[];
};

export type DocState = 'missing' | 'empty' | 'hasContent';
export type UpstreamStates = Partial<Record<MetaDocKey, DocState>>;

export type HintContext = {
  kind: DocKindId;
  selfState: DocState;
  upstream: UpstreamStates;
  language: WritingLanguage;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hasContent = (s?: DocState) => s === 'hasContent';
const isEmpty = (s?: DocState) => s === 'empty';
const isMissing = (s?: DocState) => s === 'missing';

// Only doc kinds that have hint templates
type TemplateKey = 'prose' | 'manifest' | 'outline' | 'brief';

function kindToTemplateKey(kind: DocKindId): TemplateKey | null {
  if (kind === 'prose') return 'prose';
  if (kind === 'manifest') return 'manifest';
  if (kind === 'outline') return 'outline';
  if (kind === 'brief') return 'brief';
  return null;
}

// ---------------------------------------------------------------------------
// Vite template loading
// ---------------------------------------------------------------------------

// Loads *any* ./hints/<key>-<lang>.md as raw string, lazily.
const templateLoaders = import.meta.glob('./hints/*.md', {
  as: 'raw',
});

async function loadTemplate(
  lang: WritingLanguage | undefined,
  key: TemplateKey
): Promise<string> {
  const templateLanguage = lang ?? DEFAULT_WRITING_LANGUAGE;
  const path = `./hints/${key}-${templateLanguage}.md`;

  const loader = templateLoaders[path];
  if (!loader) {
    console.warn(`[chatHints] Missing template: ${path}`);
    return '';
  }

  return (await loader()) as string;
}

async function renderIntro(
  ctx: HintContext
): Promise<string> {
  const templateKey = kindToTemplateKey(ctx.kind);
  if (!templateKey) return '';

  const template = await loadTemplate(ctx.language, templateKey);
  if (!template) return '';

  return interpolate(
    template,
    {
      selfHasContent: hasContent(ctx.selfState),
      selfIsEmpty: isEmpty(ctx.selfState),
    },
    (docKey) => hasContent(ctx.upstream[docKey as MetaDocKey])
  ).trim();
}

// ---------------------------------------------------------------------------
// Actions (per-kind only)
// ---------------------------------------------------------------------------

type ActionStrategy = (ctx: HintContext) => SuggestionAction[];

const proseActions: ActionStrategy = ({ selfState, upstream }) => {
  const out: SuggestionAction[] = [];

  if (isEmpty(selfState)) {
    if (!hasContent(upstream.manifest)) {
      out.push(actions.writeManifest);
    } else {
      if (!hasContent(upstream.brief)) out.push(actions.writeBrief);
      if (!hasContent(upstream.outline) && hasContent(upstream.brief)) {
        out.push(actions.writeOutline);
      }
    }
    out.push(actions.testWizard);
  }

  if (hasContent(selfState)) {
    if (!hasContent(upstream.manifest)) {
      out.push(actions.writeManifest);
    } else {
      if (!hasContent(upstream.brief)) out.push(actions.writeBrief);
      if (!hasContent(upstream.outline) && hasContent(upstream.brief)) {
        out.push(actions.writeOutline);
      }
    }
  }

  return out;
};

const manifestActions: ActionStrategy = ({ selfState }) => {
  const out: SuggestionAction[] = [];
  if (isEmpty(selfState)) out.push(actions.manifestStart);
  if (hasContent(selfState)) out.push(actions.manifestGaps);
  return out;
};

const outlineActions: ActionStrategy = ({ selfState, upstream }) => {
  const out: SuggestionAction[] = [];

  if (isEmpty(selfState)) {
    if (!hasContent(upstream.brief)) out.push(actions.writeBrief);
    if (hasContent(upstream.brief)) out.push(actions.outlineWizard);
  }

  if (hasContent(selfState)) out.push(actions.outlineGaps);

  return out;
};

const briefActions: ActionStrategy = ({ selfState }) => {
  const out: SuggestionAction[] = [];
  if (isEmpty(selfState)) out.push(actions.briefIdeaShortStory);
  if (hasContent(selfState)) out.push(actions.briefGaps);
  return out;
};

const actionStrategies: Partial<Record<DocKindId, ActionStrategy>> = {
  prose: proseActions,
  manifest: manifestActions,
  outline: outlineActions,
  brief: briefActions,
};

// ---------------------------------------------------------------------------
// Public API (now async because templates are lazy loaded)
// ---------------------------------------------------------------------------

export async function getInitialAssistantHint(
  ctx: HintContext
): Promise<AssistantHint | null> {
  if (isMissing(ctx.selfState)) return null;

  const introMessage = await renderIntro(ctx);
  const actions = actionStrategies[ctx.kind]?.(ctx) ?? [];

  // If there's neither intro nor actions, don’t show anything
  if (!introMessage && actions.length === 0) return null;

  return { introMessage, actions };
}