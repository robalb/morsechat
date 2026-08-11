#!/usr/bin/env node
/**
 * Compare the legacy react webapp against the svelte port.
 *
 * Live, both dev servers running:
 *   node compare.js --old http://localhost:3000 --new http://localhost:5173
 *   node compare.js --old http://localhost:3000 --new http://localhost:5173 --viewport all
 *
 * Or from snapshots taken earlier:
 *   node compare.js snapshots/react.desktop.json snapshots/svelte.desktop.json
 */
import { readFile } from "node:fs/promises";

import { parseArgs } from "./lib/args.js";
import {
	VIEWPORTS,
	parseViewport,
	snapshotPage,
	writeJson,
} from "./lib/browser.js";
import { diffSnapshots, formatReport } from "./lib/diff.js";

const { opts, positional } = parseArgs(process.argv.slice(2), {
	defaults: {
		old: "http://localhost:3000",
		new: "http://localhost:5173",
		viewport: "desktop",
		wait: "",
		settle: "500",
		ignore: "",
		tolerance: "2",
		"ignore-styles": "",
		limit: "25",
		out: "",
		shots: "",
	},
	booleans: ["json", "verbose", "headful", "help"],
});

if (opts.help) {
	console.log(`usage: node compare.js [options] [oldSnapshot.json newSnapshot.json]

  --old URL              the legacy react app        (default localhost:3000)
  --new URL              the svelte port             (default localhost:5173)
  --viewport NAME        mobile|tablet|desktop|wide|all  (default desktop)
  --wait SELECTOR        wait for this element on both pages
  --settle MS            extra delay after load      (default 500)
  --ignore SELECTOR      skip elements matching this
  --tolerance PX         box deltas below this are noise (default 2)
  --ignore-styles a,b    computed properties to skip
  --limit N              entries printed per section (default 25)
  --shots DIR            save full page screenshots of both pages here
  --out FILE             write the raw diff json here
  --json                 print the diff as json instead of a report
  --verbose              include structural paths in the report
  --headful              show the browser windows

Exits with code 1 when the pages differ, so it can gate a CI job.
`);
	process.exit(0);
}

const limit = Number(opts.limit);
const diffOptions = {
	tolerance: Number(opts.tolerance),
	ignoreStyles: opts["ignore-styles"].split(",").filter(Boolean),
};

/** two snapshot files given as positionals: pure offline comparison */
if (positional.length === 2) {
	const [a, b] = await Promise.all(
		positional.map(async (p) => JSON.parse(await readFile(p, "utf8"))),
	);
	const diff = diffSnapshots(a, b, diffOptions);
	report(diff);
	process.exit(hasDifferences(diff) ? 1 : 0);
}

const viewportNames =
	opts.viewport === "all" ? Object.keys(VIEWPORTS) : [opts.viewport];

let anyDifference = false;
const allDiffs = [];

for (const name of viewportNames) {
	const viewport = parseViewport(name);

	const common = {
		viewport,
		waitFor: opts.wait,
		settleMs: Number(opts.settle),
		ignoreSelector: opts.ignore,
		headful: Boolean(opts.headful),
	};

	// sequentially, not in parallel: two chrome instances competing for the cpu
	// make the layout timings noisier than the diff tolerance
	const a = await snapshotPage({
		...common,
		url: opts.old,
		screenshot: opts.shots ? `${opts.shots}/old.${name}.png` : undefined,
	});
	const b = await snapshotPage({
		...common,
		url: opts.new,
		screenshot: opts.shots ? `${opts.shots}/new.${name}.png` : undefined,
	});

	for (const [label, snap] of [
		["old", a],
		["new", b],
	]) {
		if (snap.meta.consoleErrors.length) {
			console.error(
				`\x1b[33m${label} page logged ${snap.meta.consoleErrors.length} console error(s)\x1b[0m`,
			);
			for (const e of snap.meta.consoleErrors.slice(0, 3)) {
				console.error(`  ${e}`);
			}
		}
	}

	const diff = diffSnapshots(a, b, diffOptions);
	allDiffs.push(diff);
	if (hasDifferences(diff)) anyDifference = true;
	report(diff);
	if (viewportNames.length > 1) console.log();
}

if (opts.out) {
	await writeJson(opts.out, allDiffs.length === 1 ? allDiffs[0] : allDiffs);
	console.error(`wrote diff to ${opts.out}`);
}

process.exit(anyDifference ? 1 : 0);

function hasDifferences(diff) {
	const s = diff.summary;
	return s.changed > 0 || s.missing > 0 || s.added > 0;
}

function report(diff) {
	if (opts.json) {
		process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
	} else {
		console.log(formatReport(diff, { limit, verbose: Boolean(opts.verbose) }));
	}
}
