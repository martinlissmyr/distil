// src/wizards/registry.ts
import type { WizardConfig, WizardId } from './types';
import { validateWizardConfig } from './validation';

// Vite: eagerly import all JSON files in ./configs
const modules = import.meta.glob('./configs/*.json', { eager: true });

type JsonModule = { default?: unknown };

const RAW_REGISTRY: Record<WizardId, unknown> = {};
for (const [, mod] of Object.entries(modules)) {
  // Vite puts JSON on `default`
  const typedMod = mod as JsonModule;
  const raw = typedMod.default ?? mod;
  if (
    raw &&
    typeof raw === 'object' &&
    'id' in raw &&
    typeof raw.id === 'string'
  ) {
    RAW_REGISTRY[raw.id as WizardId] = raw;
  }
}

const CACHE: Partial<Record<WizardId, WizardConfig>> = {};

export function getWizardConfig(wizardId: WizardId): WizardConfig {
  if (CACHE[wizardId]) return CACHE[wizardId] as WizardConfig;
  const raw = RAW_REGISTRY[wizardId];
  if (!raw) throw new Error(`Wizard config not found: ${wizardId}`);
  const validated = validateWizardConfig(raw);
  CACHE[wizardId] = validated;
  return validated;
}

export function listWizardIds(): WizardId[] {
  return Object.keys(RAW_REGISTRY);
}
