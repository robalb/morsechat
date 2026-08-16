#!/usr/bin/env node
/**
 * Drive the morse key of both apps and check what they made of it.
 *
 * `compare.js` compares what the two apps look like; this compares what they
 * do. An automated operator (lib/morsekeyer.js) holds a real key for real
 * durations, and each case reads the message preview back and says what it
 * should say.
 *
 *   node keyer-test.js                          # both apps, all cases
 *   node keyer-test.js --old "" --wpm 12        # the svelte app only
 *   node keyer-test.js --case phrase --headful  # watch one case happen
 *
 * The apps are driven on the training channel, where nothing is broadcast, so
 * a run does not put anything on a live channel and is not rate limited.
 *
 * The speed matters: the preview is decoded against the `wpm` setting, so the
 * operator has to key at the speed the app is set to. Both apps default an
 * anonymous session to 12 wpm, which is what `--wpm` defaults to; if the
 * browser is logged into an account with another speed saved, pass it.
 */
import puppeteer from "puppeteer";

import { parseArgs } from "./lib/args.js";
import { parseViewport } from "./lib/browser.js";
import {
	keyText,
	morseTimes,
	playSchedule,
	scheduleDuration,
	stretch,
	textToSchedule,
} from "./lib/morsekeyer.js";

const { opts } = parseArgs(process.argv.slice(2), {
	defaults: {
		old: "http://localhost:3000",
		new: "http://localhost:5173",
		viewport: "desktop",
		wpm: "12",
		text: "hello world",
		key: "c",
		slop: "10",
		case: "",
		timeout: "20000",
	},
	booleans: ["headful", "help", "json"],
});

const WPM = Number(opts.wpm);
/**
 * How much slower than textbook the operator keys, as a fraction. The default
 * 10% is inside what both apps decode; see `textToSchedule` for why keying to
 * the exact millisecond is a test of the react app's thresholds rather than of
 * the message.
 */
const SLOP = Number(opts.slop) / 100;
const TIMES = stretch(morseTimes(WPM), SLOP);

/** where the preview text is, in both apps (see the data-mig markers) */
const PREVIEW = '[data-mig="preview-text"]';
/** the key itself, which is also what says the app has finished loading */
const KEY_BUTTON = '[data-mig="key-left"]';
const CANCEL_BUTTON = '[aria-label="cancel message"]';

function usage() {
	console.log(`usage: node keyer-test.js [options]

  --old URL         the legacy react app   (default localhost:3000, "" to skip)
  --new URL         the svelte port        (default localhost:5173, "" to skip)
  --viewport NAME   mobile|tablet|desktop|wide  (default desktop)
  --wpm N           the speed to key at, and the speed the app is set to (12)
  --text PHRASE     what the "phrase" case keys       (default "hello world")
  --key K           the keyboard key to hold          (default c)
  --slop PERCENT    how much slower than textbook to key    (default 10)
  --case NAME       run one case: ${CASE_NAMES.join(", ")}
  --timeout MS      how long to wait for an app to render  (default 20000)
  --headful         show the browser
  --json            print the results as json

Exits with code 1 if any case fails, or if the two apps disagree.
`);
}

/**
 * The preview as a string worth comparing: the endash the apps draw a dash
 * with becomes a hyphen, and runs of whitespace become one space. Word gaps
 * are drawn as two spaces and letters can be padded with one, and none of that
 * is what a case is about.
 */
async function readPreview(page) {
	const raw = await page.$eval(PREVIEW, (node) => node.textContent ?? "");
	return raw.replaceAll("–", "-").replace(/\s+/g, " ").trim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The cases. Each keys something and returns what the preview should read.
 *
 * They are written against the behaviour of the react app, which is the
 * specification here: the port is right when it does the same thing.
 */
const CASES = [
	{
		name: "phrase",
		what: "a whole phrase decodes to itself",
		async run(page) {
			await keyText(page, opts.text, { wpm: WPM, key: opts.key, slop: SLOP });
			// the last letter is only translated once its silence has been
			// waited out, which is the letter gap plus a margin for the render
			await sleep(TIMES.letterGap + 250);
			return { actual: await readPreview(page), expected: opts.text };
		},
	},
	{
		name: "partial",
		what: "a half-keyed letter shows as dots and dashes",
		async run(page) {
			// two dots: "i" once it is finished, ".." until then
			await playSchedule(page, [TIMES.dot, TIMES.elementGap, TIMES.dot], {
				key: opts.key,
			});
			// read at once: this is the state that only exists before the
			// letter gap elapses
			return { actual: await readPreview(page), expected: ".." };
		},
	},
	{
		name: "letter",
		what: "the letter lands when the letter gap has passed",
		async run(page) {
			await playSchedule(page, [TIMES.dot, TIMES.elementGap, TIMES.dot], {
				key: opts.key,
			});
			await sleep(TIMES.letterGap + 250);
			return { actual: await readPreview(page), expected: "i" };
		},
	},
	{
		name: "unknown",
		what: "a code with no letter is shown as itself",
		async run(page) {
			const dots = [];
			for (let i = 0; i < 8; i++) {
				if (dots.length) dots.push(TIMES.elementGap);
				dots.push(TIMES.dot);
			}
			await playSchedule(page, dots, { key: opts.key });
			await sleep(TIMES.letterGap + 250);
			return { actual: await readPreview(page), expected: "........" };
		},
	},
	{
		name: "autosend",
		what: "the countdown sends the message and empties the preview",
		async run(page) {
			await keyText(page, "e", { wpm: WPM, key: opts.key, slop: SLOP });
			// 600ms of quiet before the bar starts, then submit_delay
			// milliseconds per percent: 1.2s at the default 12
			await sleep(2500);
			return { actual: await readPreview(page), expected: "" };
		},
	},
	{
		name: "cancel",
		what: "the bin button throws the message away",
		async run(page) {
			await keyText(page, "s", { wpm: WPM, key: opts.key, slop: SLOP });
			await page.click(CANCEL_BUTTON);
			await sleep(100);
			return { actual: await readPreview(page), expected: "" };
		},
	},
	{
		name: "cancelheld",
		what: "cancelling while the key is held does not poison the next message",
		async run(page) {
			// a letter first, so the bin button is not disabled
			await keyText(page, "e", { wpm: WPM, key: opts.key, slop: SLOP });
			await page.keyboard.down(opts.key);
			await sleep(200);
			await page.click(CANCEL_BUTTON);
			await page.keyboard.up(opts.key);
			await sleep(200);
			// the message that follows should be the only thing in the preview:
			// the release of a cancelled press is the end of nothing
			await keyText(page, "e", { wpm: WPM, key: opts.key, slop: SLOP });
			await sleep(TIMES.letterGap + 250);
			return { actual: await readPreview(page), expected: "e" };
		},
	},
	{
		name: "iambic",
		what: "a held paddle sends a stream of dits",
		setup: (page) => selectKeyMode(page, "yambic"),
		async run(page) {
			// The app is keying now, not us: the paddle only says "more", and
			// the element lengths come from its own wpm. One dit plus its space
			// is two dit lengths, so 750ms of holding at 12 wpm is four dits
			// with 50ms of margin at either end — "h".
			await holdKeys(page, [PADDLE_LEFT], 750);
			await sleep(TIMES.letterGap + 400);
			return { actual: await readPreview(page), expected: "h" };
		},
	},
	{
		name: "squeeze",
		what: "both paddles held alternate dit and dah",
		setup: (page) => selectKeyMode(page, "yambic"),
		async run(page) {
			// dit at 0, dah at 200 (the machine asks again after the dit and
			// its space), dit at 600, and the release at 750 lands before it
			// asks a fourth time at 800: ".-." is "r".
			await holdKeys(page, [PADDLE_LEFT, PADDLE_RIGHT], 750);
			await sleep(TIMES.letterGap + 400);
			return { actual: await readPreview(page), expected: "r" };
		},
	},
];

/* ------------------------------------------------------------------ *
 * The adaptive straight key
 *
 * Only the svelte app has it, so these cases are marked `newOnly` and
 * are skipped for the react app rather than counted as drift.
 *
 * Both of them key at a speed the app was not told about, which is the
 * whole point of the mode: `dynamic` is whether it arrives at the right
 * reading at all, and `dynamicstable` is the regression that motivated
 * the mode's design — that the words already on screen stay put when
 * the operator's speed changes underneath them.
 * ------------------------------------------------------------------ */

/** how much faster than the app's wpm setting the adaptive cases key */
const FAST = 2;

const ADAPTIVE_CASES = [
	{
		name: "dynamic",
		what: "a message keyed at twice the slider still reads back",
		newOnly: true,
		setup: (page) => selectKeyMode(page, "straight_dynamic"),
		async run(page) {
			await keyText(page, "hello world", {
				wpm: WPM * FAST,
				key: opts.key,
				slop: SLOP,
			});
			await sleep(TIMES.letterGap + 250);
			// The first letter or two are decoded against the slider, because
			// nothing has been measured yet, and cannot be right when it is
			// this wrong. What has to be right is everything after that.
			return { actual: await readPreview(page), expected: /world$/ };
		},
	},
	{
		name: "dynamicstable",
		what: "slowing down does not rewrite what is already on screen",
		newOnly: true,
		setup: (page) => selectKeyMode(page, "straight_dynamic"),
		async run(page) {
			// A word at one speed, read while it is still the whole message...
			await keyText(page, "hello", { wpm: WPM * FAST, key: opts.key, slop: SLOP });
			await sleep(TIMES.letterGap + 250);
			const before = await readPreview(page);

			// ...then the same operator, tired, at a third of that speed. The
			// naive implementation of this mode re-decodes the buffer at the
			// new measurement and turns the first word into "eeee".
			await keyText(page, "sos", {
				wpm: (WPM * FAST) / 3,
				key: opts.key,
				slop: SLOP,
			});
			await sleep(TIMES.letterGap * 3 + 250);
			const after = await readPreview(page);

			return {
				actual: `${before} | ${after}`,
				// whatever the first word was read as, it is still there
				expected: new RegExp(`^(.+) \\| ${escapeRegExp(before)}`),
			};
		},
	},
	{
		name: "dynamicdrift",
		what: "a dot-heavy letter still reads after a long message",
		newOnly: true,
		setup: (page) => selectKeyMode(page, "straight_dynamic"),
		async run(page) {
			// The operator this keys is a person and not a metronome: the hand
			// comes back up slowly between elements and stops to think between
			// letters, so the gaps run much longer than the textbook 1 and 3.
			// That hand is what broke the first version of this mode — the
			// letter gap estimate had no way to climb, so the split sank until
			// every element gap read as a letter break and an "h" late in a
			// message came out as "eeee", with the measured speed climbing as
			// it went. Hence a long message, with the dot-heavy letters at the
			// end of it.
			await keyText(page, "test message with hi and sos", {
				wpm: WPM,
				key: opts.key,
				slop: SLOP,
				gap: 1.7,
				letterGap: 5,
				wordGap: 12,
			});
			await sleep(TIMES.letterGap * 2 + 250);
			return { actual: await readPreview(page), expected: /hi and sos$/ };
		},
	},
];

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/** the two paddle keys, which both apps default to */
const PADDLE_LEFT = "z";
const PADDLE_RIGHT = "x";

/** Hold some keys down together for a while, then let go of them. */
async function holdKeys(page, keys, ms) {
	for (const key of keys) await page.keyboard.down(key);
	await sleep(ms);
	for (const key of keys) await page.keyboard.up(key);
}

/**
 * Put the app in iambic mode, through the settings popup, the way a user
 * would.
 *
 * The two apps draw the popup with different component libraries but both end
 * up with a real radio input carrying the value, and both open it from a button
 * that says "advanced" — which is as much as this needs to know about either.
 */
async function selectKeyMode(page, value) {
	const opened = await page.evaluate(() => {
		const button = [...document.querySelectorAll("button")].find((b) =>
			(b.textContent ?? "").toLowerCase().includes("advanced"),
		);
		if (!button) return false;
		button.click();
		return true;
	});
	if (!opened) throw new Error("no advanced/settings button on the page");

	const radio = `input[type="radio"][value="${value}"]`;
	await page.waitForSelector(radio, { timeout: 5000 });
	// clicked through the dom rather than at its coordinates: both libraries
	// hide the input under a drawn control, and what is being tested is the
	// keyer, not how a radio is painted
	await page.evaluate((selector) => {
		document.querySelector(selector)?.click();
	}, radio);

	// out of the popup, so that the key has the page to itself again
	await page.keyboard.press("Escape");
	await sleep(400);
	if (value === "yambic") {
		await page.waitForSelector('[data-mig="key-right"]', { timeout: 5000 });
	}
}

CASES.push(...ADAPTIVE_CASES);

const CASE_NAMES = CASES.map((c) => c.name);

if (opts.help) {
	usage();
	process.exit(0);
}

/**
 * Run every case against one app.
 *
 * The page is reloaded between cases: a case leaves a message half-written or
 * a countdown half-run, and the next one should not have to know about it.
 */
async function runApp(url, viewport, cases, { legacy = false } = {}) {
	const browser = await puppeteer.launch({
		headless: !opts.headful,
		args: ["--no-sandbox", "--disable-dev-shm-usage"],
	});
	const results = [];

	try {
		const page = await browser.newPage();
		await page.setViewport({
			width: viewport.width,
			height: viewport.height,
			deviceScaleFactor: 1,
		});

		const target = new URL(url);
		// nothing keyed here is broadcast to anyone
		target.searchParams.set("channel", "training");

		for (const testCase of cases) {
			// the react app has no adaptive mode to test
			if (legacy && testCase.newOnly) continue;

			const consoleErrors = [];
			const onError = (msg) => {
				if (msg.type?.() === "error") consoleErrors.push(msg.text());
			};
			page.on("console", onError);
			page.on("pageerror", (err) => consoleErrors.push(String(err)));

			try {
				await page.goto(target.href, {
					waitUntil: "networkidle2",
					timeout: Number(opts.timeout),
				});
				await page.waitForSelector(KEY_BUTTON, {
					timeout: Number(opts.timeout),
				});
				// the key is on screen; give the session and its settings a
				// moment to land before keying against them
				await sleep(500);

				if (testCase.setup) {
					await testCase.setup(page);
				} else if (!legacy) {
					// the svelte app starts on the adaptive straight key, the
					// react app on the fixed-wpm one. A case with no setup is a
					// case written against react, so put the port in the mode
					// react is in; the adaptive cases ask for theirs themselves.
					await selectKeyMode(page, "straight");
				}
				const { actual, expected } = await testCase.run(page);
				results.push({
					name: testCase.name,
					what: testCase.what,
					actual,
					expected: String(expected),
					// a case can ask for an exact string or, when what it is
					// checking is a shape (how many dits a held paddle sent),
					// for a pattern
					ok:
						expected instanceof RegExp ? expected.test(actual) : actual === expected,
					consoleErrors,
				});
			} catch (err) {
				results.push({
					name: testCase.name,
					what: testCase.what,
					actual: null,
					expected: null,
					ok: false,
					error: String(err.message ?? err),
					consoleErrors,
				});
			} finally {
				page.removeAllListeners("console");
				page.removeAllListeners("pageerror");
			}
		}
	} finally {
		await browser.close();
	}

	return results;
}

function report(label, results) {
	console.log(`\n${label}`);
	for (const r of results) {
		const mark = r.ok ? "  ok  " : "FAIL  ";
		console.log(`${mark}${r.name.padEnd(10)} ${r.what}`);
		if (!r.ok) {
			if (r.error) {
				console.log(`        error:    ${r.error}`);
			} else {
				console.log(`        expected: ${JSON.stringify(r.expected)}`);
				console.log(`        got:      ${JSON.stringify(r.actual)}`);
			}
		}
		if (r.consoleErrors?.length) {
			for (const line of r.consoleErrors.slice(0, 3)) {
				console.log(`        console: ${line}`);
			}
		}
	}
}

/** What the two apps did differently, which is the point of the whole harness. */
function reportParity(oldResults, newResults) {
	const drift = [];
	for (const a of oldResults) {
		const b = newResults.find((r) => r.name === a.name);
		if (!b) continue;
		if (a.actual !== b.actual) drift.push({ name: a.name, old: a.actual, new: b.actual });
	}

	console.log("\nparity");
	if (drift.length === 0) {
		console.log("  the two apps read the same message back in every case");
		return true;
	}
	for (const d of drift) {
		console.log(`  ${d.name}`);
		console.log(`        react:  ${JSON.stringify(d.old)}`);
		console.log(`        svelte: ${JSON.stringify(d.new)}`);
	}
	return false;
}

const viewport = parseViewport(opts.viewport);
const cases = opts.case
	? CASES.filter((c) => c.name === opts.case)
	: CASES;

if (cases.length === 0) {
	console.error(`unknown case "${opts.case}". Known: ${CASE_NAMES.join(", ")}`);
	process.exit(2);
}

const schedule = textToSchedule(opts.text, WPM, { slop: SLOP });
if (!opts.json) {
	console.log(
		`keying at ${WPM} wpm +${opts.slop}% (dit ${TIMES.dot}ms), "${opts.text}" takes ` +
			`${(scheduleDuration(schedule) / 1000).toFixed(1)}s`,
	);
}

const oldResults = opts.old ? await runApp(opts.old, viewport, cases, { legacy: true }) : null;
const newResults = opts.new ? await runApp(opts.new, viewport, cases) : null;

if (opts.json) {
	console.log(JSON.stringify({ wpm: WPM, old: oldResults, new: newResults }, null, 2));
} else {
	if (oldResults) report(`react ${opts.old}`, oldResults);
	if (newResults) report(`svelte ${opts.new}`, newResults);
}

let ok = true;
for (const results of [oldResults, newResults]) {
	if (results) ok = results.every((r) => r.ok) && ok;
}
if (oldResults && newResults && !opts.json) {
	ok = reportParity(oldResults, newResults) && ok;
}

process.exit(ok ? 0 : 1);
