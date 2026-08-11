#!/usr/bin/env node
/**
 * Take a structural snapshot of a page and write it to disk.
 *
 *   node snapshot.js --url http://localhost:3000 --out snapshots/react.mobile.json
 *   node snapshot.js --url http://localhost:5173 --viewport desktop --screenshot shots/svelte.png
 */
import { parseArgs } from "./lib/args.js";
import { parseViewport, snapshotPage, writeJson } from "./lib/browser.js";

const { opts } = parseArgs(process.argv.slice(2), {
	defaults: {
		url: "http://localhost:3000",
		viewport: "desktop",
		wait: "",
		settle: "500",
		ignore: "",
		out: "",
		screenshot: "",
	},
	booleans: ["headful", "help"],
});

if (opts.help) {
	console.log(`usage: node snapshot.js [options]

  --url URL              page to load                    (default localhost:3000)
  --viewport NAME|WxH    mobile|tablet|desktop|wide      (default desktop)
  --wait SELECTOR        wait for this element to appear
  --settle MS            extra delay after load          (default 500)
  --ignore SELECTOR      skip elements matching this
  --out FILE             write the snapshot json here    (default stdout)
  --screenshot FILE      also save a full page png
  --headful              show the browser window
`);
	process.exit(0);
}

const viewport = parseViewport(opts.viewport);

const snapshot = await snapshotPage({
	url: opts.url,
	viewport,
	waitFor: opts.wait,
	settleMs: Number(opts.settle),
	ignoreSelector: opts.ignore,
	screenshot: opts.screenshot || undefined,
	headful: Boolean(opts.headful),
});

if (snapshot.meta.consoleErrors.length) {
	console.error(
		`\x1b[33m${snapshot.meta.consoleErrors.length} console error(s) on ${opts.url}\x1b[0m`,
	);
	for (const e of snapshot.meta.consoleErrors.slice(0, 5)) {
		console.error(`  ${e}`);
	}
}

if (opts.out) {
	await writeJson(opts.out, snapshot);
	console.error(
		`wrote ${snapshot.nodes.length} nodes to ${opts.out} (${viewport.name} ${viewport.width}x${viewport.height})`,
	);
} else {
	process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}
