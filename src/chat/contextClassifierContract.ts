export type EntityDepth = 'projection' | 'full';

export type ContextClassificationResult<TKey extends string = string> = {
  relevantContexts: TKey[];
  entityDepths: Map<TKey, EntityDepth>;
  result: Record<string, unknown> | null;
};

type Logger = Pick<Console, 'error'>;

export function parseClassifierJson(
  raw: string,
  logger: Logger = console
): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch (error) {
    logger.error('LLM classification returned invalid JSON:', {
      error,
      raw: trimmed,
    });
    return null;
  }
}

export function applyContextClassificationResult<TKey extends string>(params: {
  relevantContexts: TKey[];
  ambiguousNeededContexts: TKey[];
  result: Record<string, unknown>;
  isEntityIndexContext: (key: TKey) => boolean;
}): ContextClassificationResult<TKey> {
  const {
    relevantContexts,
    ambiguousNeededContexts,
    result,
    isEntityIndexContext,
  } = params;
  const nextRelevantContexts = [...relevantContexts];
  const entityDepths = new Map<TKey, EntityDepth>();

  for (const key of ambiguousNeededContexts) {
    const value = result[key];
    if (value === true || value === 'true' || value === 1) {
      nextRelevantContexts.push(key);
    }
  }

  const uniqueRelevantContexts = Array.from(new Set(nextRelevantContexts));

  for (const key of ambiguousNeededContexts) {
    if (!isEntityIndexContext(key) || !uniqueRelevantContexts.includes(key)) {
      continue;
    }

    const depthValue = result[`${key}Depth`];
    entityDepths.set(
      key,
      depthValue === 'projection' || depthValue === 'full'
        ? depthValue
        : 'projection'
    );
  }

  return {
    relevantContexts: uniqueRelevantContexts,
    entityDepths,
    result,
  };
}

export function selectEntityIdsFromClassifierResult(
  entityIds: string[],
  result: Record<string, unknown>
): string[] {
  return entityIds.filter((id) => {
    const value = result[id];
    return value === true || value === 'true' || value === 1;
  });
}
