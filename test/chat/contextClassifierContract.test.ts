import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyContextClassificationResult,
  parseClassifierJson,
  selectEntityIdsFromClassifierResult,
} from '../../src/chat/contextClassifierContract.js';

type TestContextKey = 'brief' | 'outline' | 'world' | 'characters' | 'locations';

test('parseClassifierJson parses valid JSON', () => {
  assert.deepEqual(parseClassifierJson('{"brief":true}'), { brief: true });
});

test('parseClassifierJson treats empty output as no result', () => {
  assert.equal(parseClassifierJson('   \n'), null);
});

test('parseClassifierJson treats malformed output as no result', () => {
  const errors: unknown[] = [];
  const logger = {
    error: (...args: unknown[]) => {
      errors.push(args);
    },
  };

  assert.equal(parseClassifierJson('{"brief":', logger), null);
  assert.equal(errors.length, 1);
});

test('applyContextClassificationResult adds truthy contexts and deduplicates existing contexts', () => {
  const result = applyContextClassificationResult({
    relevantContexts: ['brief'],
    ambiguousNeededContexts: ['brief', 'outline', 'world'],
    result: {
      brief: true,
      outline: 'true',
      world: false,
    },
    isEntityIndexContext: () => false,
  });

  assert.deepEqual(result.relevantContexts, ['brief', 'outline']);
  assert.deepEqual([...result.entityDepths.entries()], []);
});

test('applyContextClassificationResult defaults entity depth to projection when omitted', () => {
  const result = applyContextClassificationResult({
    relevantContexts: [],
    ambiguousNeededContexts: ['characters'],
    result: {
      characters: true,
    },
    isEntityIndexContext: (key: TestContextKey) => key === 'characters',
  });

  assert.deepEqual(result.relevantContexts, ['characters']);
  assert.equal(result.entityDepths.get('characters'), 'projection');
});

test('applyContextClassificationResult preserves full entity depth when provided', () => {
  const result = applyContextClassificationResult({
    relevantContexts: [],
    ambiguousNeededContexts: ['locations'],
    result: {
      locations: 1,
      locationsDepth: 'full',
    },
    isEntityIndexContext: (key: TestContextKey) => key === 'locations',
  });

  assert.deepEqual(result.relevantContexts, ['locations']);
  assert.equal(result.entityDepths.get('locations'), 'full');
});

test('selectEntityIdsFromClassifierResult returns only directly selected entities', () => {
  assert.deepEqual(
    selectEntityIdsFromClassifierResult(['char-1', 'char-2', 'char-3'], {
      'char-1': true,
      'char-2': 'true',
      'char-3': false,
    }),
    ['char-1', 'char-2']
  );
});
