import { actions } from './actions';
import type { DocKindId, StoryDocKindId } from '../models/docs';
import type { MetaDocKey } from '../types/metaDoc';
import type { OpenWizardCommand } from '../wizards/types';
import type { WritingLanguage } from '../types/language';
import { interpolate } from '../helpers/interpolate';
import { DEFAULT_WRITING_LANGUAGE } from '../types/language';
import { docKinds, contextLayerOrder } from '../models/docs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestionActionKind = 'prompt' | 'wizard' | 'navigate';

export type NavigateCommand =
  | { type: 'navigateToStorySection'; section: StoryDocKindId }
  | { type: 'navigateToManifest' };

export type LocalizedString = Record<WritingLanguage, string>;

// Multi-language action definition (as stored in index.ts)
export type SuggestionAction = {
  id: string;
  label: LocalizedString;
  kind: SuggestionActionKind;
  prompt?: string;
  displayMessage?: LocalizedString;
  command?: OpenWizardCommand | NavigateCommand;
};

// Single-language action for UI rendering
export type LocalizedSuggestionAction = {
  id: string;
  label: string;
  kind: SuggestionActionKind;
  prompt?: string;
  displayMessage?: string;
  command?: OpenWizardCommand | NavigateCommand;
};

export type AssistantHint = {
  introMessage: string;
  actions: LocalizedSuggestionAction[];
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
type TemplateKey = 'prose' | 'manifest' | 'outline' | 'brief' | 'world' | 'characters' | 'locations';

function kindToTemplateKey(kind: DocKindId): TemplateKey | null {
  if (kind === 'prose') return 'prose';
  if (kind === 'manifest') return 'manifest';
  if (kind === 'outline') return 'outline';
  if (kind === 'brief') return 'brief';
  if (kind === 'world') return 'world';
  if (kind === 'characters') return 'characters';
  if (kind === 'locations') return 'locations';
  return null;
}

// Helper to pick a localized string from LocalizedString
function pickLocalizedString(text: LocalizedString, lang: WritingLanguage): string {
  // fallback order: exact lang -> default lang -> first available
  return (
    text[lang] ??
    text[DEFAULT_WRITING_LANGUAGE] ??
    Object.values(text).find((v) => typeof v === 'string' && v.length > 0) ??
    ''
  );
}

// Converts multi-language action to single-language action for use in UI
function localizeAction(action: SuggestionAction, lang: WritingLanguage): LocalizedSuggestionAction {
  return {
    ...action,
    label: pickLocalizedString(action.label, lang),
    displayMessage: action.displayMessage ? pickLocalizedString(action.displayMessage, lang) : undefined,
  };
}

function getWriteActionForTopmostMissingUpstreamDoc(
  currentKind: DocKindId,
  upstream: Partial<Record<MetaDocKey, DocState>>
) {
  const currentCfg = docKinds[currentKind];
  if (!currentCfg) return null;

  const currentLayerIdx = contextLayerOrder.indexOf(currentCfg.contextLayer);

  // Candidate upstream keys = keys present in upstream (already computed by your rules)
  const candidates = (Object.keys(upstream) as MetaDocKey[])
    .filter((k) => {
      const cfg = docKinds[k];
      if (!cfg) return false;

      // must be "above" current kind
      const layerIdx = contextLayerOrder.indexOf(cfg.contextLayer);
      if (layerIdx === -1 || layerIdx >= currentLayerIdx) return false;

      // contentless = not hasContent
      return !hasContent(upstream[k]);
    })
    .sort((a, b) => {
      const ai = contextLayerOrder.indexOf(docKinds[a].contextLayer);
      const bi = contextLayerOrder.indexOf(docKinds[b].contextLayer);
      return ai - bi; // most upstream first
    });

  const topmost = candidates[0];
  if (!topmost) return null;

  // Map doc kind -> write action
  switch (topmost) {
    case 'manifest':
      return actions.writeManifest;
    case 'brief':
      return actions.writeBrief;
    case 'outline':
      return actions.writeOutline;
    // add this only if you actually have it
    // case 'world':
    //   return actions.writeWorld;
    default:
      return null;
  }
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

type ActionStrategy = (ctx: HintContext) => LocalizedSuggestionAction[];

/* PROSE */
const proseActions: ActionStrategy = ({ upstream, language, kind }) => {
  const out: LocalizedSuggestionAction[] = [];

  const actionForTopmostMissingUpstreamDoc = getWriteActionForTopmostMissingUpstreamDoc(kind, upstream);
  if (actionForTopmostMissingUpstreamDoc) {
    out.push(localizeAction(actionForTopmostMissingUpstreamDoc, language));
  }

  return out;
};

/* MANIFEST */
const manifestActions: ActionStrategy = ({ selfState, language }) => {
  const out: LocalizedSuggestionAction[] = [];
  if (isEmpty(selfState)) out.push(localizeAction(actions.manifestStart, language));
  if (hasContent(selfState)) out.push(localizeAction(actions.manifestGaps, language));
  return out;
};

/* OUTLINE */
const outlineActions: ActionStrategy = ({ selfState, upstream, language, kind }) => {
  const out: LocalizedSuggestionAction[] = [];

  const actionForTopmostMissingUpstreamDoc = getWriteActionForTopmostMissingUpstreamDoc(kind, upstream);
  if (actionForTopmostMissingUpstreamDoc) {
    out.push(localizeAction(actionForTopmostMissingUpstreamDoc, language));
  }

  if (isEmpty(selfState)) out.push(localizeAction(actions.outlineHints, language));

  if (hasContent(selfState)) out.push(localizeAction(actions.outlineGaps, language));

  return out;
};

/* BRIEF */
const briefActions: ActionStrategy = ({ selfState, upstream, language, kind }) => {
  const out: LocalizedSuggestionAction[] = [];

  const actionForTopmostMissingUpstreamDoc = getWriteActionForTopmostMissingUpstreamDoc(kind, upstream);
  if (actionForTopmostMissingUpstreamDoc) {
    out.push(localizeAction(actionForTopmostMissingUpstreamDoc, language));
  }

  if (hasContent(selfState)) out.push(localizeAction(actions.briefGaps, language));

  if (!hasContent(selfState)) out.push(localizeAction(actions.briefDrafter, language));

  return out;
};

const actionStrategies: Partial<Record<DocKindId, ActionStrategy>> = {
  prose: proseActions,
  manifest: manifestActions,
  outline: outlineActions,
  brief: briefActions,
};

// ---------------------------------------------------------------------------
// Public API (async because templates are lazy loaded)
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