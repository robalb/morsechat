/**
 * The corpus, typed into the decoders, checked.
 *
 * The playground shows three algorithms reading the same hand and leaves the
 * judging to whoever is looking at it. That is how the causal decoder was
 * arrived at and it is not how it stays correct: the interesting failures here
 * are the ones a person only notices when they happen to be watching the right
 * box at the right moment. So the same recordings go through the same decoders
 * (test/harness.ts), and what the operator would have seen is turned into three
 * numbers per replay — text taken back after being shown, `eeee`/`tttt` in the
 * result, and agreement with what they meant to key.
 *
 *   npm test
 *   node --experimental-strip-types --import ./test/loader.mjs --test 'test/*.test.ts'
 *
 * The assertions are deliberately lopsided. The no-rewrite rule is asserted
 * exactly, per recording, because it is a design promise and one violation is a
 * bug; accuracy is asserted as a floor well under where it sits, because the
 * corpus is three hand-keyed messages and a threshold tight enough to be
 * interesting would be a threshold that fails on the fourth. Read the summary
 * table for the real numbers — it is printed on every run, passing or not.
 *
 * The corpus contains a message nothing reads correctly (a hand keying at about
 * twice the speed its slider claims, `rmsvm93wnq8`). It is in the corpus on
 * purpose and the thresholds below are set with it included: a test suite that
 * only kept the recordings the decoder gets right would be measuring the
 * curator.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { decodeMessage, measure } from '$lib/morse/average';
import getDialect from '$lib/utils/dialects';
import { ALGORITHMS } from '$lib/playground/decoders';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { replay, type Result } from './harness.ts';

/** the recordings worth scoring: one without `expected` cannot be marked */
const CORPUS = SAVED_RECORDINGS.filter((r) => r.expected.trim() !== '');

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
    for (const id of ['causal', 'guenther-hold', 'global_average_simple', 'window']) {
      const r = results(id)[i];
      console.log(
        `    ${id.padEnd(22)}"${flat(r.final)}"  (read as ${r.measuredWpm}wpm)`
      );
    }
  }
  console.log('');
});

/* ------------------------------------------------------------------ *
 * The promise: a letter, once shown, is never touched again
 * ------------------------------------------------------------------ */

/**
 * The decoders that promise never to rewrite anything at all.
 *
 * Three are excluded, for three different reasons. `average` is the control: it
 * is on the page *because* it rewrites. `window` is the one live algorithm with
 * a budget — it may re-read the first few letters of a message, and has its own
 * tests below for staying inside it. And `global_average_simple` is not a live
 * decoder at all: it is the receiver's, which re-reads the whole message every
 * time a new element lands in it. What it promises instead is that it never
 * shows a reading it is in no position to have — see its own tests.
 */
const EXEMPT = new Set(['average', 'window', 'global_average_simple']);
const CAUSAL = ALGORITHMS.filter((a) => !EXEMPT.has(a.id));

/** how many letters into a message the window decoder may still change its
 * mind, as lib/morse/window.ts is configured */
const FLICKER_LETTERS = 4;

describe('the promise', () => {
  for (const algorithm of CAUSAL) {
    for (const [i, recording] of CORPUS.entries()) {
      test(`${algorithm.id} never rewrites what it has shown — ${recording.id}`, () => {
        const r = results(algorithm.id)[i];
        assert.deepEqual(
          r.rewrites.map((w) => `${w.at}ms: "${w.from}" became "${w.to}"`),
          [],
          'text already on screen changed: the operator was keying the next letter while trusting these'
        );
        assert.equal(r.churnedChars, 0);
      });
    }
  }
});

describe('causal decoder', () => {

  test('reads most of the corpus exactly', () => {
    const rs = results('causal');
    const exact = rs.filter((r) => letters(r.final) === letters(r.expected));
    // 2 of the 3 at the time of writing; the third is the fast-hand recording
    assert.ok(
      exact.length >= rs.length - 1,
      `only ${exact.length}/${rs.length} exact: ${rs
        .filter((r) => letters(r.final) !== letters(r.expected))
        .map((r) => `${r.recording.id} read "${flat(r.final)}"`)
        .join('; ')}`
    );
  });

  test('agrees with the operator more often than not', () => {
    // sits at 68% with the fast-hand recording dragging it down
    assert.ok(mean('causal', (r) => r.accuracy) >= 0.6, `${mean('causal', (r) => r.accuracy)}`);
  });

  test('does not fall apart into eeee and tttt', () => {
    // one recording produces them and the other two must not, so this is a
    // budget rather than a zero: what it catches is a change that spreads the
    // collapse to a message that used to read cleanly
    assert.ok(total('causal', (r) => r.runs) <= 2, `${total('causal', (r) => r.runs)} runs`);
    for (const [i, recording] of CORPUS.entries()) {
      const causal = results('causal')[i];
      const fixed = results('fixed')[i];
      assert.ok(
        causal.runs <= fixed.runs,
        `${recording.id}: ${causal.runs} runs against the slider's ${fixed.runs}`
      );
    }
  });

  test('beats the slider it replaces', () => {
    assert.ok(
      mean('causal', (r) => r.accuracy) >= mean('fixed', (r) => r.accuracy),
      'the adaptive decoder reads the corpus worse than the fixed one does'
    );
  });
});

/* ------------------------------------------------------------------ *
 * Guenther, and what the two additions to it are worth
 * ------------------------------------------------------------------ */

describe('guenther + gaps + hold', () => {
  test('reads the corpus at least as well as the decoder in the app', () => {
    assert.ok(
      mean('guenther-hold', (r) => r.accuracy) >= mean('causal', (r) => r.accuracy),
      `${mean('guenther-hold', (r) => r.accuracy)} against ${mean('causal', (r) => r.accuracy)}`
    );
  });

  test('leaves less of the corpus as eeee and tttt than any other forward decoder', () => {
    // the window search has none at all, but it is allowed to look at a group
    // of elements together and re-read them; this is the best a decoder that
    // commits one element at a time manages
    const mine = total('guenther-hold', (r) => r.runs);
    for (const algorithm of ALGORITHMS.filter((a) => a.id !== 'window')) {
      assert.ok(
        mine <= total(algorithm.id, (r) => r.runs),
        `${mine} runs against ${algorithm.id}'s ${total(algorithm.id, (r) => r.runs)}`
      );
    }
  });

  test('the measured gaps are what fixed the paper', () => {
    // the whole reason `spaces` exists: with one threshold taken off the pulse
    // average, these hands come apart. If this ever stops being true the
    // variant has stopped being a variant.
    assert.ok(
      total('guenther', (r) => r.runs) > total('guenther-spaces', (r) => r.runs),
      'the paper as written no longer collapses on this corpus'
    );
  });

  test('holding costs less than a second of latency', () => {
    // what `hold` is paying with: the last letter of a message appears this
    // long after the key came up. Worth watching — a decoder that never
    // committed anything until the message ended would score perfectly on
    // every other number here.
    const lag = mean('guenther-hold', (r) => r.tailLag);
    assert.ok(lag < 1000, `${lag.toFixed(0)}ms`);
  });
});

/* ------------------------------------------------------------------ *
 * The window search, and the budget it is allowed
 * ------------------------------------------------------------------ */

describe('window search', () => {
  for (const [i, recording] of CORPUS.entries()) {
    test(`only rewrites inside the first ${FLICKER_LETTERS} letters — ${recording.id}`, () => {
      // The deal this decoder is built on. It is allowed to change its mind
      // while the message is still a few letters long, because the speed is
      // genuinely unknown then and nobody has started reading; from the moment
      // it is longer, it is as strict as everything else on the page. What that
      // means concretely is that no rewrite ever takes back more than the first
      // few letters — if one did, text that had been on screen for seconds
      // would be moving.
      for (const rewrite of results('window')[i].rewrites) {
        assert.ok(
          letters(rewrite.from).length <= FLICKER_LETTERS,
          `took back "${rewrite.from}" at ${rewrite.at}ms, past the ${FLICKER_LETTERS}-letter budget`
        );
      }
    });
  }

  test('reads all but at most one recording of the corpus exactly', () => {
    // including the fast-hand recording, which every forward decoder here opens
    // with a run of `e`s: the search can see that four presses and three
    // hesitations make an `h`, and a decoder that commits element by element
    // cannot. The allowance of one is for the corpus growing — it is a set of
    // hand-keyed messages and it is meant to keep growing, so a threshold that
    // only passes while every single one is read is a threshold that fails on
    // whichever recording is added next.
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

  test('pays under a second and a half of latency for it', () => {
    const lag = mean('window', (r) => r.tailLag);
    assert.ok(lag < 1500, `${lag.toFixed(0)}ms`);
  });
});

/* ------------------------------------------------------------------ *
 * The whole-message decoder: the receiver's, not the sender's
 * ------------------------------------------------------------------ */

describe('global average simple', () => {
  test('never shows a run of e or t that is not in its answer', () => {
    // The complaint this decoder was written for: an `h` that spends the first
    // second of a message as `eeee` and then collapses into a letter. It cannot
    // do that, because it will not read a message as letters at all until the
    // presses have fallen into two groups — until a dash has arrived there is
    // nothing to measure a dot against, and `eeee` is the only reading on
    // offer. The elements sit there as elements instead, and become letters
    // when there is something to decide them with.
    for (const [i, recording] of CORPUS.entries()) {
      const r = results('global_average_simple')[i];
      assert.equal(r.phantomRun, 0, `${recording.id}: showed a run of ${r.peakRun}`);
    }
  });

  test('the streaming average it is a copy of does show one', () => {
    // the control for the test above: if `global average` ever stops flashing
    // its `eeee`, the harness has stopped seeing them rather than this decoder
    // having become unnecessary
    assert.ok(
      total('average', (r) => r.phantomRun) > 0,
      'nothing flashed: the phantom-run measurement is not measuring anything'
    );
  });

  test('reads a finished message at least as well as the streaming average', () => {
    assert.ok(
      mean('global_average_simple', (r) => r.accuracy) >= mean('average', (r) => r.accuracy),
      `${mean('global_average_simple', (r) => r.accuracy)} against ${mean('average', (r) => r.accuracy)}`
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

  test('does not split one cloud of presses in two', () => {
    // The correction over the streaming average, and the reason it is not just
    // "take the mean". A message of nothing but dots has a mean, and half its
    // dots fall below it: a decoder that always splits always finds "dashes",
    // and reports a hand twice as fast as the one that keyed it.
    const dots = [58, 62, 55, 65, 60, 57, 63, 59];
    const buffer: number[] = [];
    for (const ms of dots) buffer.push(ms, 60);
    const dot = measure(buffer)?.dot ?? null;
    assert.ok(dot !== null && dot > 50 && dot < 70, `${dot}`);
  });

  test('measures a textbook hand from both of its clusters', () => {
    // 100ms dot, 300ms dash, the gaps where the textbook says: the estimate
    // should land on the dot and not somewhere between the two clusters
    const buffer = [100, 100, 300, 300, 100, 100, 300, 700, 300, 100, 100];
    const dot = measure(buffer)?.dot ?? null;
    assert.ok(dot !== null && dot > 85 && dot < 115, `${dot}`);
  });
});

/* ------------------------------------------------------------------ *
 * The control
 *
 * Without this the no-rewrite tests above could pass because the harness
 * stopped detecting rewrites, which is exactly the kind of green a decoder test
 * suite must not be able to produce. The averaging decoder is in the playground
 * because it rewrites; if it ever stops, the measurement is broken, not it.
 * ------------------------------------------------------------------ */

describe('global average decoder (the control)', () => {
  test('rewrites text it has already shown', () => {
    assert.ok(
      total('average', (r) => r.rewrites.length) > 0,
      'the averaging decoder churned nothing: the harness is no longer measuring churn'
    );
  });

  test('churns more than the causal decoder', () => {
    assert.ok(total('average', (r) => r.churnedChars) > total('causal', (r) => r.churnedChars));
  });
});
