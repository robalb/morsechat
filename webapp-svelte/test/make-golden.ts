/**
 * Freezes what the decoders say about every generated case.
 *
 *   node --experimental-strip-types --import ./test/loader.mjs test/make-golden.ts
 *
 * Run it once against a version that is known good, commit the result, and
 * test/average.test.ts and test/window.test.ts then hold every later version to
 * it. It is a record of behaviour and not of correctness: regenerating it is
 * how a deliberate change to an algorithm is landed, and the diff is the change.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

import * as average from './average-cases.ts';
import * as window from './window-cases.ts';

mkdirSync(new URL('./golden/', import.meta.url), { recursive: true });
for (const { GOLDEN_PATH, snapshot } of [average, window]) {
  writeFileSync(GOLDEN_PATH, `${JSON.stringify(snapshot(), null, 1)}\n`);
  console.log(`wrote ${GOLDEN_PATH.pathname}`);
}
