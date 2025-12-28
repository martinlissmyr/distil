// src/types/language.ts

export type WritingLanguage = 'sv' | 'en';

// Source of truth for what you support (dropdowns, validation, etc.)
export const SUPPORTED_WRITING_LANGUAGES: readonly WritingLanguage[] = ['sv', 'en'] as const;

// Source of truth for default
export const DEFAULT_WRITING_LANGUAGE: WritingLanguage = 'sv';

// Labels for UI
export const WRITING_LANGUAGE_LABEL: Record<WritingLanguage, string> = {
  sv: 'Swedish',
  en: 'English',
};