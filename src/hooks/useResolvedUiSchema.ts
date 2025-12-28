// src/hooks/useResolvedUiSchema.ts
import { useEffect, useMemo, useState } from 'react';
import type { UiSchemaSetting, UiSchema } from '../types/ui';
import { DEFAULT_UI_SCHEMA_SETTING } from '../types/ui';
import { useAppStore } from '../state/useAppStore';

export function useResolvedUiSchema() {
  // ✅ single source of truth = zustand
  const setting = useAppStore((s) => s.uiSchemaSetting);
  const uiSchemaLoaded = useAppStore((s) => s.uiSchemaLoaded);
  const loadUiSchema = useAppStore((s) => s.loadUiSchema);

  const [systemScheme, setSystemScheme] = useState<UiSchema>(DEFAULT_UI_SCHEMA_SETTING);

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

    const unsubscribe = window.theme.onChange((next) => setSystemScheme(next));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [setting]);

  const resolved: UiSchema = useMemo(() => {
    const effectiveSetting = setting ?? DEFAULT_UI_SCHEMA_SETTING;
    if (effectiveSetting === 'system') return systemScheme;
    return effectiveSetting; // 'dark' | 'light'
  }, [setting, systemScheme]);

  return { resolved, setting: setting ?? DEFAULT_UI_SCHEMA_SETTING };
}