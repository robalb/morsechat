/**
 * What average.ts is asked, and what its answer is recorded as.
 *
 * One place, so that the file that writes the golden record
 * (test/make-golden.ts) and the test that checks against it
 * (test/average.test.ts) cannot ask different questions.
 *
 * The cases are the generated hands of test/synth.ts and the hand-keyed corpus
 * both, and each one is put through the whole public surface: the measurement,
 * and the decode in both renderings. The dot is rounded to a tenth of a
 * millisecond — the algorithm is arithmetic on floats and the last bits of it
 * are not a promise to anybody, but a tenth of a ms at 60wpm is a thousandth of
 * a dot, so nothing that could change a reading survives the rounding.
 */
import { measure, decodeMessage } from '$lib/morse/average';
import getDialect from '$lib/utils/dialects';
import { SAVED_RECORDINGS } from '$lib/playground/recordings';

import { CASES, type Case } from './synth.ts';

const DIALECT = getDialect('international');

export const GOLDEN_PATH = new URL('./golden/average.json', import.meta.url);

/** every case the record covers: the generated hands, then the real ones */
export const ALL_CASES: Case[] = [
  ...CASES,
  ...SAVED_RECORDINGS.map((r) => ({
    id: `corpus/${r.id}`,
    text: r.expected,
    buffer: r.buffer,
    wpm: r.wpm,
  })),
];

/** everything average.ts will say about one buffer */
export interface Reading {
  id: string;
  dot: number | null;
  separated: boolean | null;
  dashes: number | null;
  wpm: number;
  /** decoded as letters, and as the dots and dashes they were keyed as */
  text: string;
  morse: string;
  /** and the same message read while it is still being keyed */
  partial: string;
}

export function read(one: Case): Reading {
  const measured = measure(one.buffer);
  const options = { dialect: DIALECT, wpm: one.wpm };
  return {
    id: one.id,
    dot: measured === null ? null : Math.round(measured.dot * 10) / 10,
    separated: measured === null ? null : measured.separated,
    dashes: measured === null ? null : measured.dashes,
    wpm: Math.round((measured === null ? one.wpm : 1200 / measured.dot) * 10) / 10,
    text: decodeMessage(one.buffer, { ...options, showReadable: true }),
    morse: decodeMessage(one.buffer, { ...options, showReadable: false }),
    partial: decodeMessage(one.buffer, { ...options, showReadable: true, complete: false }),
  };
}

export function snapshot(): Reading[] {
  return ALL_CASES.map(read);
}
