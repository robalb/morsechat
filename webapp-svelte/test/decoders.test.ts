/**
 * The corpus, typed into the decoders, checked.
 *
 * The playground shows the algorithms reading the same hand and leaves the
 * judging to whoever is looking at it. That is how the three that are left were
 * arrived at, and it is not how they stay correct: the interesting failures are
 * the ones a person only notices when they happen to be watching the right box
 * at the right moment. So the same recordings go through the same decoders
 * (test/harness.ts), and what the operator would have seen is turned into
 * numbers — text taken back after being shown, `eeee`/`tttt` in the result, and
 * agreement with what they meant to key.
 *
 *   npm test
 *
 * This file is about the three algorithms against each other, on hand-keyed
 * messages. What each one does on its own, over a hundred generated hands, is
 * in test/average.test.ts and test/window.test.ts.
 *
 * The assertions are deliberately lopsided. The no-rewrite rules are asserted
 * exactly, per recording, because they are design promises and one violation is
 * a bug; accuracy is asserted as a floor well under where it sits, because the
 * corpus is five hand-keyed messages and a threshold tight enough to be
 * interesting would be one that fails on the sixth. Read the summary table for
 * the real numbers — it is printed on every run, passing or not.
 *
 * The corpus contains a message the slider has no chance with (a hand keying at
 * about twice the speed its setting claims, `rmsvm93wnq8`). It is in the corpus
 * on purpose and the thresholds below are set with it included: a test suite
 * that only kept the recordings the decoders get right would be measuring the
 * curator.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { decodeMessage } from '$lib/morse/average';
import getDialect from '$lib/utils/dialects';
import { ALGORITHMS } from '$lib/playground/decoders';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { replay, type Result } from './harness.ts';

/**
 * The recordings worth scoring: one without `expected` cannot be marked, and a
 * lone `-` is the same thing written down — a recording keyed into the corpus
 * whose text has not been typed in yet. Scoring against a placeholder would
 * measure whoever has not filled it in.
 */
const UNMARKED = ['', '-'];
const CORPUS = SAVED_RECORDINGS.filter((r) => !UNMARKED.includes(r.expected.trim()));

/** every algorithm against the whole corpus, replayed once and reused below */
const RESULTS = new Map<string, Result[]>(
  ALGORITHMS.map((algorithm) => [
    algorithm.id,
    CORPUS.map((recording) => replay(algorithm.create(), recording)),
  ])
);

const results = (id: string): Result[] => {
  const found = RESULTS.get(id);
  assert.ok(found, `no algorithm "${id}" in lib/playground/decoders.ts`);
  return found;
};

const total = (id: string, of: (r: Result) => number): number =>
  results(id).reduce((sum, r) => sum + of(r), 0);

const mean = (id: string, of: (r: Result) => number): number =>
  total(id, of) / Math.max(results(id).length, 1);

/** a line as it reads, for showing next to the one it should have been */
const flat = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The letters, and not where the decoder put the gaps between them.
 *
 * Word breaks are scored out here and in the harness both. They are a separate
 * decision from reading an element — it is the operator's pause between two
 * letters that has to be long enough, and a hand that hesitates mid-word
 * produces `h ello` from a perfectly read message — so counting them would mix
 * "misread a dash" with "took a breath" in one number.
 */
const letters = (text: string): string => flat(text).replace(/ /g, '');

/* ------------------------------------------------------------------ *
 * The summary
 *
 * Printed rather than asserted. Most of what these numbers are good for is
 * being compared against the same numbers from before a change, which is a job
 * for a person reading two runs, not for a threshold.
 * ------------------------------------------------------------------ */

test('summary', () => {
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  console.log(
    `\n  ${pad('algorithm', 36)} ${pad('accuracy', 9)} ${pad('exact', 6)} ` +
      `${pad('rewrites', 9)} ${pad('churn', 6)} ${pad('e/t runs', 9)} ${pad('phantom', 8)} tail lag`
  );
  for (const algorithm of ALGORITHMS) {
    const rs = results(algorithm.id);
    const exact = rs.filter((r) => letters(r.final) === letters(r.expected)).length;
    console.log(
      `  ${pad(algorithm.name, 36)} ` +
        `${pad(`${(100 * mean(algorithm.id, (r) => r.accuracy)).toFixed(0)}%`, 9)} ` +
        `${pad(`${exact}/${rs.length}`, 6)} ` +
        `${pad(total(algorithm.id, (r) => r.rewrites.length), 9)} ` +
        `${pad(total(algorithm.id, (r) => r.churnedChars), 6)} ` +
        `${pad(total(algorithm.id, (r) => r.runs), 9)} ` +
        `${pad(Math.max(0, ...rs.map((r) => r.phantomRun)), 8)} ` +
        `${mean(algorithm.id, (r) => r.tailLag).toFixed(0)}ms`
    );
  }
  for (const [i, recording] of CORPUS.entries()) {
    console.log(`\n  ${recording.id} @ ${recording.wpm}wpm`);
    console.log(`    want    "${flat(recording.expected)}"`);
    for (const algorithm of ALGORITHMS) {
      const r = results(algorithm.id)[i];
      console.log(`    ${algorithm.id.padEnd(22)}"${flat(r.final)}"  (read as ${r.measuredWpm}wpm)`);
    }
  }
  console.log('');
});

/* ------------------------------------------------------------------ *
 * The promise: a letter, once shown, is never touched again
 * ------------------------------------------------------------------ */

/** how many letters into a message the window decoder may still change its
 * mind, as lib/morse/window.ts is configured */
const FLICKER_LETTERS = 4;

describe('the promise', () => {
  for (const [i, recording] of CORPUS.entries()) {
    test(`fixed never rewrites what it has shown — ${recording.id}`, () => {
      // it cannot: the threshold it read the first letter with is the one it
      // will still be using at the end of the message
      const r = results('fixed')[i];
      assert.deepEqual(
        r.rewrites.map((w) => `${w.at}ms: "${w.from}" became "${w.to}"`),
        [],
        'text already on screen changed: the operator was keying the next letter while trusting these'
      );
      assert.equal(r.churnedChars, 0);
    });

    test(`scale only re-reads the first ${FLICKER_LETTERS} letters — ${recording.id}`, () => {
      // the same deal as the window search below, and the same budget: while a
      // message is that short nobody has started reading it, and from the
      // moment it is longer every character it has shown is permanent
      for (const rewrite of results('scale')[i].rewrites) {
        assert.ok(
          letters(rewrite.from).length <= FLICKER_LETTERS,
          `took back "${rewrite.from}" at ${rewrite.at}ms, past the ${FLICKER_LETTERS}-letter budget`
        );
      }
    });

    test(`window only re-reads the first ${FLICKER_LETTERS} letters — ${recording.id}`, () => {
      // The deal that decoder is built on. It may change its mind while the
      // message is still a few letters long, because the speed is genuinely
      // unknown then and nobody has started reading; from the moment it is
      // longer it is as strict as the slider. What that means concretely is
      // that no rewrite ever takes back more than the first few letters — if
      // one did, text that had been on screen for seconds would be moving.
      for (const rewrite of results('window')[i].rewrites) {
        assert.ok(
          letters(rewrite.from).length <= FLICKER_LETTERS,
          `took back "${rewrite.from}" at ${rewrite.at}ms, past the ${FLICKER_LETTERS}-letter budget`
        );
      }
    });
  }
});

/* ------------------------------------------------------------------ *
 * The fitted scale
 * ------------------------------------------------------------------ */

describe('one fitted scale', () => {
  test('reads all but at most one recording of the corpus exactly', () => {
    // The allowance of one is for the corpus growing — it is a set of
    // hand-keyed messages and it is meant to keep growing, so a threshold that
    // only passes while every single one is read is one that fails on whichever
    // recording is added next. It currently reads all seven.
    const rs = results('scale');
    const missed = rs.filter((r) => letters(r.final) !== letters(r.expected));
    assert.ok(
      missed.length <= 1,
      missed.map((r) => `${r.recording.id} read "${flat(r.final)}"`).join('; ')
    );
    assert.ok(mean('scale', (r) => r.accuracy) >= 0.9, `${mean('scale', (r) => r.accuracy)}`);
  });

  test('produces no eeee and no tttt at all', () => {
    assert.equal(total('scale', (r) => r.runs), 0);
    assert.equal(total('scale', (r) => r.peakRun), 0);
  });

  test('pays under a second and a half of latency for it', () => {
    // R9. It commits a character as soon as a silence ends it rather than
    // holding one back, so this sits well under the bound — which is the half
    // of the bargain that the churn numbers above do not show.
    const lag = mean('scale', (r) => r.tailLag);
    assert.ok(lag < 1500, `${lag.toFixed(0)}ms`);
  });

  test('agrees with itself run over the finished buffer', () => {
    // R14: the same fit, one of which had to guess where the message was going.
    // Where they differ is what reading in real time cost.
    const live = results('scale').map((r) => letters(r.final));
    const still = results('scale_static').map((r) => letters(r.final));
    const differ = live.filter((got, i) => got !== still[i]);
    assert.ok(differ.length <= 1, live.map((got, i) => `"${got}" / "${still[i]}"`).join('; '));
  });
});

/* ------------------------------------------------------------------ *
 * The window search: what the chat's dynamic key runs
 * ------------------------------------------------------------------ */

describe('window search', () => {
  test('reads all but at most one recording of the corpus exactly', () => {
    // The allowance of one is for the corpus growing — it is a set of
    // hand-keyed messages and it is meant to keep growing, so a threshold that
    // only passes while every single one is read is one that fails on whichever
    // recording is added next.
    const rs = results('window');
    const missed = rs.filter((r) => letters(r.final) !== letters(r.expected));
    assert.ok(
      missed.length <= 1,
      missed.map((r) => `${r.recording.id} read "${flat(r.final)}"`).join('; ')
    );
    assert.ok(mean('window', (r) => r.accuracy) >= 0.9, `${mean('window', (r) => r.accuracy)}`);
  });

  test('produces no eeee and no tttt at all', () => {
    assert.equal(total('window', (r) => r.runs), 0);
    assert.equal(total('window', (r) => r.peakRun), 0);
  });

  test('beats the slider it replaces', () => {
    assert.ok(
      mean('window', (r) => r.accuracy) > mean('fixed', (r) => r.accuracy),
      'the window search reads the corpus no better than the fixed decoder does'
    );
    for (const [i, recording] of CORPUS.entries()) {
      const win = results('window')[i];
      const fixed = results('fixed')[i];
      assert.ok(
        win.runs <= fixed.runs,
        `${recording.id}: ${win.runs} runs against the slider's ${fixed.runs}`
      );
    }
  });

  test('pays under a second and a half of latency for it', () => {
    // what it buys the readings with: the last letter of a message appears this
    // long after the key came up. Worth watching — a decoder that showed
    // nothing until the operator stopped would score perfectly on every other
    // number here.
    const lag = mean('window', (r) => r.tailLag);
    assert.ok(lag < 1500, `${lag.toFixed(0)}ms`);
  });
});

/* ------------------------------------------------------------------ *
 * The whole-message decoder: the receiver's and the server's
 * ------------------------------------------------------------------ */

describe('global average simple', () => {
  test('never shows a run of e or t that is not in its answer', () => {
    // The complaint this decoder was written for: an `h` that spends the first
    // second of a message as `eeee` and then collapses into a letter. It cannot
    // do that, because it will not read a message as letters at all until the
    // presses have fallen into two groups — until a dash has arrived there is
    // nothing to measure a dot against, and `eeee` is the only reading on
    // offer. The elements sit there as elements instead.
    for (const [i, recording] of CORPUS.entries()) {
      const r = results('global_average_simple')[i];
      assert.equal(r.phantomRun, 0, `${recording.id}: showed a run of ${r.peakRun}`);
    }
  });

  test('reads a finished message better than the slider does', () => {
    assert.ok(
      mean('global_average_simple', (r) => r.accuracy) > mean('fixed', (r) => r.accuracy),
      `${mean('global_average_simple', (r) => r.accuracy)} against ${mean('fixed', (r) => r.accuracy)}`
    );
  });

  test('decodes the corpus in one call, off the buffer alone', () => {
    // what the server and the receiver actually do with it: one buffer in, one
    // line out, no replay and no state
    const dialect = getDialect('international');
    const read = CORPUS.map((recording) =>
      letters(decodeMessage(recording.buffer, { dialect, showReadable: true, wpm: recording.wpm }))
    );
    const exact = read.filter((got, i) => got === letters(CORPUS[i].expected)).length;
    assert.ok(exact >= CORPUS.length - 2, read.join(' | '));
  });
});
