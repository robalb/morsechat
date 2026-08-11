import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import puppeteer from "puppeteer";

import { DEFAULT_STYLE_PROPS, extractSnapshot } from "./extract.js";

/**
 * Named viewports, matching the breakpoints declared in
 * webapp/src/pages/appLayout.css (800px tablet, 1400px desktop, 1800px huge).
 * The snapshots are taken slightly inside each band so that a breakpoint that
 * is off by a pixel in the port shows up as a whole-layout diff.
 */
export const VIEWPORTS = {
	mobile: { width: 420, height: 850 },
	tablet: { width: 1000, height: 900 },
	desktop: { width: 1500, height: 950 },
	wide: { width: 1920, height: 1080 },
};

export function parseViewport(name) {
	if (VIEWPORTS[name]) return { name, ...VIEWPORTS[name] };
	const m = /^(\d+)x(\d+)$/.exec(name);
	if (!m) {
		throw new Error(
			`unknown viewport "${name}". Use WIDTHxHEIGHT or one of: ${Object.keys(VIEWPORTS).join(", ")}`,
		);
	}
	return { name, width: Number(m[1]), height: Number(m[2]) };
}

/**
 * Load a page and return a structural snapshot of it.
 *
 * @param {object} opts
 * @param {string} opts.url            page to load
 * @param {object} opts.viewport       {name, width, height}
 * @param {string} [opts.waitFor]      css selector to wait for before snapshotting
 * @param {number} [opts.settleMs]     extra delay, for animations and late renders
 * @param {string} [opts.ignoreSelector] elements matching this are skipped
 * @param {string} [opts.screenshot]   path of a full page png to write
 * @param {boolean} [opts.headful]     show the browser window
 * @param {string[]} [opts.styleProps] computed properties to capture
 */
export async function snapshotPage(opts) {
	const {
		url,
		viewport,
		waitFor,
		settleMs = 500,
		ignoreSelector = "",
		screenshot,
		headful = false,
		styleProps = DEFAULT_STYLE_PROPS,
	} = opts;

	const browser = await puppeteer.launch({
		headless: !headful,
		args: ["--no-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		const page = await browser.newPage();
		await page.setViewport({
			width: viewport.width,
			height: viewport.height,
			deviceScaleFactor: 1,
		});

		const consoleErrors = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});
		page.on("pageerror", (err) => consoleErrors.push(String(err)));

		await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

		if (waitFor) {
			await page.waitForSelector(waitFor, { timeout: 15000 });
		}
		if (settleMs > 0) {
			await new Promise((r) => setTimeout(r, settleMs));
		}

		// the status pill and the typing dots animate forever; freezing the
		// animations keeps the screenshots and the boxes reproducible
		await page.addStyleTag({
			content:
				"*,*::before,*::after{animation-play-state:paused!important;transition:none!important}",
		});

		if (screenshot) {
			await mkdir(dirname(screenshot), { recursive: true });
			await page.screenshot({ path: screenshot, fullPage: true });
		}

		const result = await page.evaluate(extractSnapshot, {
			captureStyles: styleProps,
			ignoreSelector,
			maxNodes: 4000,
			minSize: 1,
		});

		return {
			meta: {
				url,
				takenAt: new Date().toISOString(),
				viewport,
				waitFor: waitFor || null,
				consoleErrors,
			},
			...result,
		};
	} finally {
		await browser.close();
	}
}

export async function writeJson(path, data) {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}
