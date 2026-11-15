import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyzeTrack } from '../lib/analyze.js';

const kinds = (texts, readable = true) =>
  analyzeTrack({ renders: texts.map((text, t) => ({ t, text })), readable }, { dot: 100 }).steps.map(
    (step) => step.kind
  );

test('a letter grows, resolves, and the next one appends', () => {
  assert.deepEqual(kinds(['', ' .', ' ..', 'i', 'i .', 'ie', 'ie  ', 'ie   –', 'ie  t']), [
    'empty', 'grow', 'grow', 'resolve', 'grow', 'resolve', 'append', 'grow', 'resolve',
  ]);
});

test('text that was shown and then changed is a rewrite', () => {
  const analysis = analyzeTrack(
    { renders: [{ t: 0, text: 'he' }, { t: 1, text: 'hi' }], readable: true },
    { dot: 100 }
  );
  assert.equal(analysis.rewrites.length, 1);
  assert.deepEqual([analysis.rewrites[0].lost, analysis.rewrites[0].added], ['e', 'i']);
});

test('a pending letter that vanishes without resolving is a rewrite', () => {
  assert.deepEqual(kinds(['he', 'he .', 'he']), ['append', 'grow', 'rewrite']);
});

test('the morse view only ever appends', () => {
  assert.deepEqual(kinds(['.', '..', '.. ', '.. –', '. –'], false), [
    'grow', 'grow', 'append', 'grow', 'rewrite',
  ]);
});

test('clearing the preview is not jitter', () => {
  const analysis = analyzeTrack(
    { renders: [{ t: 0, text: 'e' }, { t: 1, text: '' }], readable: true, expected: 'e' },
    { dot: 100 }
  );
  assert.equal(analysis.rewrites.length, 0);
  assert.equal(analysis.clears, 1);
  assert.equal(analysis.match, true);
});
