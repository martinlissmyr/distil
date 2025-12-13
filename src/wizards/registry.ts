// src/wizards/registry.ts
import type { WizardConfig, WizardId } from './types';
import { validateWizardConfig } from './validation';

// Vite: eagerly import all JSON files in ./configs
const modules = import.meta.glob('./configs/*.json', { eager: true });

const RAW_REGISTRY: Record<WizardId, any> = {};
for (const [path, mod] of Object.entries(modules)) {
  // Vite puts JSON on `default`
  const raw = (mod as any).default ?? mod;
  if (raw?.id) RAW_REGISTRY[raw.id as WizardId] = raw;
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