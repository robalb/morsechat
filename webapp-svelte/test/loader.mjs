/**
 * What vite does for imports, done for `node --test`.
 *
 * The app's modules are written for the bundler: they import `$lib/...` and
 * they leave the extension off. Node's ESM resolver does neither, so a test
 * that imports lib/playground/decoders.ts directly cannot find a single one of
 * its dependencies without this.
 *
 * It is a resolve hook and nothing else — no transform, no cache. The type
 * annotations are stripped by node itself (`--experimental-strip-types`), the
 * same way webapp-migration-tools/adaptive-sim.ts runs the decoder outside a
 * browser, so what the tests execute is the same source the app ships and not a
 * compiled copy of it that could drift.
 *
 * Registered with `--import ./test/loader.mjs`; see the `test` script in
 * package.json.
 */
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

/** the alias vite.config.js declares */
const LIB = new URL('../src/lib/', import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith('$lib/')) spec = new URL(spec.slice('$lib/'.length), LIB).href;

    // extensionless relative import: the bundler would try .ts, so try it here
    if (/^(\.|file:)/.test(spec) && !/\.[a-z]+$/i.test(spec)) {
      const url = new URL(spec, context.parentURL);
      if (existsSync(fileURLToPath(`${url.href}.ts`))) spec = `${url.href}.ts`;
    }

    return nextResolve(spec, context);
  },
});
