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

type LocalizedText = string | Partial<Record<WritingLanguage, string>>;

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

function pickLang(text: LocalizedText | undefined, lang: WritingLanguage): string | undefined {
  if (!text) return undefined;
  if (typeof text === 'string') return text;

  // fallback order: exact lang -> default lang -> any existing -> undefined
  return (
    text[lang] ??
    text[DEFAULT_WRITING_LANGUAGE] ??
    Object.values(text).find((v) => typeof v === 'string' && v.length > 0)
  );
}

function localizeAction(action: any, lang: WritingLanguage): SuggestionAction {
  return {
    ...action,
    label: pickLang(action.label, lang) ?? action.id,
    displayMessage: pickLang(action.displayMessage, lang),
  };
}

// ---------------------------------------------------------------------------
// Vite template loading
// ---------------------------------------------------------------------------

// Loads *any* ./hints/<key>-<lang>.md as raw string, lazily.
const templateLoaders = import.meta.glob('./hints/*.md', {
  query: '?raw',
  import: 'default',
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

const proseActions: ActionStrategy = ({ selfState, upstream, language }) => {
  const out: SuggestionAction[] = [];

  if (isEmpty(selfState)) {
    if (!hasContent(upstream.manifest)) {
      out.push(localizeAction(actions.writeManifest, language));
    } else {
      if (!hasContent(upstream.brief)) out.push(localizeAction(actions.writeBrief, language));
      if (!hasContent(upstream.outline) && hasContent(upstream.brief)) {
        out.push(localizeAction(actions.writeOutline, language));
      }
    }
    out.push(localizeAction(actions.testWizard, language));
  }

  if (hasContent(selfState)) {
    if (!hasContent(upstream.manifest)) {
      out.push(localizeAction(actions.writeManifest, language));
    } else {
      if (!hasContent(upstream.brief)) out.push(localizeAction(actions.writeBrief, language));
      if (!hasContent(upstream.outline) && hasContent(upstream.brief)) {
        out.push(localizeAction(actions.writeOutline, language));
      }
    }
  }

  return out;
};

const manifestActions: ActionStrategy = ({ selfState, language }) => {
  const out: SuggestionAction[] = [];
  if (isEmpty(selfState)) out.push(localizeAction(actions.manifestStart, language));
  if (hasContent(selfState)) out.push(localizeAction(actions.manifestGaps, language));
  return out;
};

const outlineActions: ActionStrategy = ({ selfState, upstream, language }) => {
  const out: SuggestionAction[] = [];

  if (isEmpty(selfState)) {
    if (!hasContent(upstream.brief)) out.push(localizeAction(actions.writeBrief, language));
    if (hasContent(upstream.brief)) out.push(localizeAction(actions.outlineWizard, language));
  }

  if (hasContent(selfState)) out.push(localizeAction(actions.outlineGaps, language));

  return out;
};

const briefActions: ActionStrategy = ({ selfState, upstream, language }) => {
  const out: SuggestionAction[] = [];
  if (isEmpty(selfState) && hasContent(upstream.manifest)) {
    out.push(localizeAction(actions.briefIdeaShortStory, language));
  }
  if (hasContent(selfState)) out.push(localizeAction(actions.briefGaps, language));
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