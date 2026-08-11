/**
 * Compare two snapshots produced by lib/extract.js.
 *
 * Matching happens in three passes, from the most trustworthy signal to the
 * weakest. Every node is consumed by at most one pass:
 *
 *   1. `data-mig` — an explicit marker you can drop on both implementations
 *      when a component is genuinely hard to match automatically.
 *   2. semantic key — tag + role + aria-label + id + own text. Survives a
 *      rewrite, because it is the part of the markup that the user perceives.
 *   3. structural path — class-free `body>div>header>button:1`. The fallback,
 *      for the layout wrappers that carry no text and no label.
 */

const PASSES = [
	{ name: "data-mig", key: (n) => n.mig },
	{ name: "semantic", key: (n) => (n.semantic.includes("|") ? n.semantic : null) },
	{ name: "path", key: (n) => n.path },
];

function indexBy(nodes, keyFn) {
	const map = new Map();
	nodes.forEach((node, i) => {
		const key = keyFn(node);
		if (!key) return;
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(i);
	});
	return map;
}

function matchNodes(aNodes, bNodes) {
	const takenA = new Set();
	const takenB = new Set();
	const pairs = [];

	for (const pass of PASSES) {
		const aIndex = indexBy(aNodes, pass.key);
		const bIndex = indexBy(bNodes, pass.key);
		for (const [key, aList] of aIndex) {
			const bList = bIndex.get(key);
			if (!bList) continue;
			// ambiguous keys are matched in document order, which is the only
			// ordering both implementations are expected to agree on
			const freeA = aList.filter((i) => !takenA.has(i));
			const freeB = bList.filter((i) => !takenB.has(i));
			for (let i = 0; i < Math.min(freeA.length, freeB.length); i++) {
				takenA.add(freeA[i]);
				takenB.add(freeB[i]);
				pairs.push({ a: freeA[i], b: freeB[i], via: pass.name, key });
			}
		}
	}

	return {
		pairs,
		onlyA: aNodes.map((_, i) => i).filter((i) => !takenA.has(i)),
		onlyB: bNodes.map((_, i) => i).filter((i) => !takenB.has(i)),
	};
}

function boxDiff(a, b, tolerance) {
	const deltas = {};
	for (const k of ["x", "y", "w", "h"]) {
		const d = Math.round((b.box[k] - a.box[k]) * 100) / 100;
		if (Math.abs(d) > tolerance) deltas[k] = d;
	}
	return Object.keys(deltas).length ? deltas : null;
}

function mapDiff(a, b, ignore = []) {
	const out = {};
	for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
		if (ignore.includes(key)) continue;
		if (a[key] !== b[key]) out[key] = { old: a[key], new: b[key] };
	}
	return Object.keys(out).length ? out : null;
}

/**
 * @param {object} a          snapshot of the reference (react) page
 * @param {object} b          snapshot of the ported (svelte) page
 * @param {object} [options]
 * @param {number} [options.tolerance]     px below which a box delta is noise
 * @param {string[]} [options.ignoreStyles] computed properties to skip
 */
export function diffSnapshots(a, b, options = {}) {
	const { tolerance = 2, ignoreStyles = [] } = options;
	const { pairs, onlyA, onlyB } = matchNodes(a.nodes, b.nodes);

	const changed = [];
	let identical = 0;

	for (const pair of pairs) {
		const an = a.nodes[pair.a];
		const bn = b.nodes[pair.b];
		const box = boxDiff(an, bn, tolerance);
		const attributes = mapDiff(an.attributes, bn.attributes);
		const styles = mapDiff(an.styles, bn.styles, ignoreStyles);
		const text = an.fullText !== bn.fullText
			? { old: an.fullText, new: bn.fullText }
			: null;

		if (!box && !attributes && !styles && !text) {
			identical++;
			continue;
		}
		changed.push({
			via: pair.via,
			key: pair.key,
			tag: an.tag,
			path: { old: an.path, new: bn.path },
			box: { old: an.box, new: bn.box, delta: box },
			attributes,
			styles,
			text,
			// how badly this one is off, used for ranking the report
			score:
				(box ? Object.values(box).reduce((s, v) => s + Math.abs(v), 0) : 0) +
				(styles ? Object.keys(styles).length * 4 : 0) +
				(attributes ? Object.keys(attributes).length * 10 : 0) +
				(text ? 25 : 0),
		});
	}

	changed.sort((x, y) => y.score - x.score);

	return {
		summary: {
			reference: a.meta.url,
			candidate: b.meta.url,
			viewport: a.meta.viewport,
			nodes: { reference: a.nodes.length, candidate: b.nodes.length },
			matched: pairs.length,
			identical,
			changed: changed.length,
			missing: onlyA.length,
			added: onlyB.length,
			documentSize: { reference: a.documentSize, candidate: b.documentSize },
		},
		changed,
		missing: onlyA.map((i) => a.nodes[i]),
		added: onlyB.map((i) => b.nodes[i]),
	};
}

const GRAY = "\x1b[90m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function shortNode(n) {
	const label = n.attributes["aria-label"] || n.attributes.id || n.text;
	return `<${n.tag}>${label ? ` "${label}"` : ""} ${GRAY}${n.path}${RESET}`;
}

/** Render a diff as a terminal report. */
export function formatReport(diff, { limit = 25, verbose = false } = {}) {
	const s = diff.summary;
	const lines = [];
	const push = (l = "") => lines.push(l);

	push(`${BOLD}morsechat migration diff${RESET}`);
	push(`  reference  ${s.reference}`);
	push(`  candidate  ${s.candidate}`);
	push(
		`  viewport   ${s.viewport.name} (${s.viewport.width}x${s.viewport.height})`,
	);
	push(
		`  nodes      ${s.nodes.reference} reference / ${s.nodes.candidate} candidate`,
	);
	push(
		`  result     ${GREEN}${s.identical} identical${RESET}, ${YELLOW}${s.changed} changed${RESET}, ${RED}${s.missing} missing${RESET}, ${s.added} added`,
	);
	if (
		s.documentSize.reference.w !== s.documentSize.candidate.w ||
		s.documentSize.reference.h !== s.documentSize.candidate.h
	) {
		push(
			`  ${YELLOW}document size differs${RESET} ${s.documentSize.reference.w}x${s.documentSize.reference.h} -> ${s.documentSize.candidate.w}x${s.documentSize.candidate.h}`,
		);
	}

	if (diff.missing.length) {
		push();
		push(`${RED}${BOLD}missing in candidate${RESET} (${diff.missing.length})`);
		for (const n of diff.missing.slice(0, limit)) push(`  - ${shortNode(n)}`);
		if (diff.missing.length > limit) {
			push(`  ${GRAY}... ${diff.missing.length - limit} more${RESET}`);
		}
	}

	if (diff.added.length) {
		push();
		push(`${GREEN}${BOLD}only in candidate${RESET} (${diff.added.length})`);
		for (const n of diff.added.slice(0, limit)) push(`  + ${shortNode(n)}`);
		if (diff.added.length > limit) {
			push(`  ${GRAY}... ${diff.added.length - limit} more${RESET}`);
		}
	}

	if (diff.changed.length) {
		push();
		push(
			`${YELLOW}${BOLD}changed${RESET} (${diff.changed.length}, worst first)`,
		);
		for (const c of diff.changed.slice(0, limit)) {
			push(`  ${BOLD}<${c.tag}>${RESET} ${GRAY}${c.key} [${c.via}]${RESET}`);
			if (c.box.delta) {
				const d = Object.entries(c.box.delta)
					.map(([k, v]) => `${k}${v > 0 ? "+" : ""}${v}`)
					.join(" ");
				push(
					`      box   ${d}  ${GRAY}(${c.box.old.x},${c.box.old.y} ${c.box.old.w}x${c.box.old.h} -> ${c.box.new.x},${c.box.new.y} ${c.box.new.w}x${c.box.new.h})${RESET}`,
				);
			}
			if (c.text) push(`      text  "${c.text.old}" -> "${c.text.new}"`);
			for (const [k, v] of Object.entries(c.attributes || {})) {
				push(`      attr  ${k}: ${v.old} -> ${v.new}`);
			}
			for (const [k, v] of Object.entries(c.styles || {})) {
				push(`      css   ${k}: ${v.old} -> ${v.new}`);
			}
			if (verbose) push(`      path  ${c.path.old} -> ${c.path.new}`);
		}
		if (diff.changed.length > limit) {
			push(`  ${GRAY}... ${diff.changed.length - limit} more${RESET}`);
		}
	}

	if (!diff.changed.length && !diff.missing.length && !diff.added.length) {
		push();
		push(`${GREEN}the two pages are structurally identical${RESET}`);
	}

	return lines.join("\n");
}
