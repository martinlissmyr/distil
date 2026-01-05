// src/hooks/useResolvedUiSchema.ts
import { useEffect, useMemo, useState } from 'react';
import type { UiSchema } from '../types/ui';
import { DEFAULT_UI_SCHEMA_SETTING } from '../types/ui';
import { useAppStore } from '../state/useAppStore';

export function useResolvedUiSchema() {
  // ✅ single source of truth = zustand
  const setting = useAppStore((s) => s.uiSchemaSetting);
  const uiSchemaLoaded = useAppStore((s) => s.uiSchemaLoaded);
  const loadUiSchema = useAppStore((s) => s.loadUiSchema);

  // systemScheme holds the actual system theme ('dark' or 'light'), defaulting to 'dark' until fetched
  const [systemScheme, setSystemScheme] = useState<UiSchema>('dark');

  // ✅ Load persisted setting once (via store)
  useEffect(() => {
    if (!uiSchemaLoaded) void loadUiSchema();
  }, [uiSchemaLoaded, loadUiSchema]);

  // Always fetch system scheme once
  useEffect(() => {
    let cancelled = false;

    window.theme.get().then((resp) => {
      if (cancelled) return;
      if (resp.ok) setSystemScheme(resp.data);
      else console.error('Failed to get system theme:', resp.error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to system changes ONLY if setting === 'system'
  useEffect(() => {
    if (setting !== 'system') return;

    window.theme.onChange((next) => setSystemScheme(next));
    // Note: window.theme.onChange returns void, no cleanup needed
  }, [setting]);

  const resolved: UiSchema = useMemo(() => {
    const effectiveSetting = setting ?? DEFAULT_UI_SCHEMA_SETTING;
    if (effectiveSetting === 'system') return systemScheme;
    return effectiveSetting; // 'dark' | 'light'
  }, [setting, systemScheme]);

  return { resolved, setting: setting ?? DEFAULT_UI_SCHEMA_SETTING };
}