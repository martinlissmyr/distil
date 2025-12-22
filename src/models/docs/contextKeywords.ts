// src/models/docs/contextKeywords.ts
import type { MetaDocKey } from '../types/metaDoc';
import type WritingLanguage from '../types/language';

// Keywords that suggest the user needs context documents
// Organized by language and doc kind
const CONTEXT_KEYWORDS: Record<
  WritingLanguage,
  Partial<Record<MetaDocKey, string[]>>
> = {
  sv: {
    brief: [
      'brief', 'premiss', 'koncept', 'tema', 'ton', 'stil',
      'genre', 'målgrupp', 'sammanfattning',
      'handlar', 'övergripande', 'helhet',
      'huvudidé', 'idé', 'grundidé', 'kärnidé', 'berättelseidé',
    ],
    outline: [
      'outline', 'plot', 'plott', 'struktur', 'disposition', 'sekvens',
      'kapitel', 'akt', 'tidslinje', 'berättarbåge',
      'progression', 'händer', 'flöde', 'handling',
      'händelseförlopp', 'kronologi', 'berättelse',
    ],
    world: [
      'world', 'världen', 'värld', 'miljö', 'setting', 'tidsperiod', 'epok',
      'plats', 'platser', 'geografi', 'samhälle', 'kultur',
      'världsbygge', 'worldbuilding', 'regler', 'lagar', 'fysik',
      'historisk', 'kontext', 'tid', 'rum',
    ],
  },
  en: {
    brief: [
      'premise', 'concept', 'theme', 'tone', 'style',
      'genre', 'audience', 'summary', 'pitch',
      'about', 'story', 'idea',
    ],
    outline: [
      'plot', 'structure', 'outline', 'sequence',
      'chapter', 'act', 'timeline', 'story arc',
      'progression', 'what happens', 'flow',
    ],
    world: [
      'world', 'setting', 'time period', 'era', 'epoch',
      'place', 'places', 'location', 'geography', 'society', 'culture',
      'worldbuilding', 'world building', 'rules', 'laws', 'physics',
      'historical', 'context', 'time', 'space',
    ],
  },
};

export function getContextKeywordsForLanguage(
  language: WritingLanguage
): Partial<Record<MetaDocKey, string[]>> {
  return CONTEXT_KEYWORDS[language] ?? CONTEXT_KEYWORDS.sv;
}

export function getKeywordsForDocKind(
  language: WritingLanguage,
  kind: MetaDocKey
): string[] {
  const langMap = getContextKeywordsForLanguage(language);
  return langMap[kind] ?? [];
}