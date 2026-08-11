/**
 * The DOM extraction routine.
 *
 * This function is serialized and executed *inside the browser page*, so it
 * cannot reference anything from the node scope. Everything it needs must
 * arrive through its single `options` argument.
 *
 * It returns a flat list of the visible elements on the page, each one carrying
 * enough information to be compared against the equivalent element of a
 * different implementation of the same page:
 *
 *  - a set of matching keys (see lib/keys.js for how they are used)
 *  - the bounding box, relative to the document
 *  - the interesting attributes
 *  - a curated list of computed styles
 *
 * Class names are deliberately *not* used for matching: the react app uses
 * css-modules hashes and MUI generated classes, the svelte app will not.
 * They are still recorded (normalized) for informational purposes.
 */
export function extractSnapshot(options) {
	const {
		captureStyles,
		ignoreSelector,
		maxNodes,
		minSize,
	} = options;

	/** attributes worth comparing across implementations */
	const ATTR_ALLOWLIST = [
		"id",
		"role",
		"type",
		"href",
		"src",
		"alt",
		"title",
		"value",
		"placeholder",
		"disabled",
		"hidden",
		"tabindex",
		"data-mig",
		"data-signature",
	];

	const isAriaAttr = (name) => name.startsWith("aria-");

	/**
	 * css-modules turns `.header` into `._header_1a2b3_4`, MUI emits
	 * `css-1q2w3e` and `MuiButton-root`. Strip the volatile parts so the
	 * recorded class list stays readable in a diff.
	 */
	function normalizeClass(cls) {
		return cls
			.replace(/^_+/, "")
			.replace(/_[a-z0-9]{4,}_[a-z0-9]+$/i, "")
			.replace(/^css-[a-z0-9]+$/i, "css-*")
			.replace(/-[a-f0-9]{6,}$/i, "");
	}

	/** the text owned by this element, excluding the text of its children */
	function ownText(el) {
		let out = "";
		for (const node of el.childNodes) {
			if (node.nodeType === 3) out += node.nodeValue;
		}
		return out.replace(/\s+/g, " ").trim().slice(0, 120);
	}

	/** the full text of the element, used as a weak matching hint */
	function fullText(el) {
		return (el.innerText || el.textContent || "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 120);
	}

	/**
	 * A class-free structural path: `html>body>div>header>button:2`.
	 * The index is the position among the siblings sharing the same tag, and it
	 * is omitted when the element is the only one of its tag, so that adding an
	 * unrelated sibling of a different tag does not shift every path.
	 */
	function structuralPath(el) {
		const parts = [];
		let cur = el;
		while (cur && cur.nodeType === 1) {
			const tag = cur.tagName.toLowerCase();
			const parent = cur.parentElement;
			if (!parent) {
				parts.unshift(tag);
				break;
			}
			const sameTag = [...parent.children].filter(
				(c) => c.tagName === cur.tagName,
			);
			parts.unshift(
				sameTag.length > 1 ? `${tag}:${sameTag.indexOf(cur)}` : tag,
			);
			cur = parent;
		}
		return parts.join(">");
	}

	/**
	 * The semantic identity of an element: what a human would use to point at
	 * it ("the button labelled Register"). This survives a rewrite far better
	 * than a structural path does.
	 */
	function semanticKey(el) {
		const bits = [el.tagName.toLowerCase()];
		const role = el.getAttribute("role");
		if (role) bits.push(`role=${role}`);
		const label = el.getAttribute("aria-label") || el.getAttribute("alt");
		if (label) bits.push(`label=${label}`);
		const id = el.id;
		if (id) bits.push(`id=${id}`);
		const text = ownText(el);
		if (text) bits.push(`text=${text}`);
		return bits.join("|");
	}

	const scrollX = window.scrollX;
	const scrollY = window.scrollY;
	const nodes = [];
	const walker = document.createTreeWalker(
		document.body,
		NodeFilter.SHOW_ELEMENT,
	);

	let el = document.body;
	do {
		if (nodes.length >= maxNodes) break;
		if (ignoreSelector && el.matches(ignoreSelector)) continue;

		const rect = el.getBoundingClientRect();
		const cs = window.getComputedStyle(el);

		// skip what the user cannot see: it only adds noise to the diff
		if (cs.display === "none" || cs.visibility === "hidden") continue;
		if (rect.width < minSize && rect.height < minSize) continue;

		const attributes = {};
		for (const attr of el.attributes) {
			if (ATTR_ALLOWLIST.includes(attr.name) || isAriaAttr(attr.name)) {
				attributes[attr.name] = attr.value;
			}
		}

		const styles = {};
		for (const prop of captureStyles) {
			styles[prop] = cs.getPropertyValue(prop);
		}

		nodes.push({
			tag: el.tagName.toLowerCase(),
			path: structuralPath(el),
			semantic: semanticKey(el),
			mig: el.getAttribute("data-mig") || null,
			classes: [...el.classList].map(normalizeClass).sort(),
			text: ownText(el),
			fullText: fullText(el),
			box: {
				x: Math.round((rect.left + scrollX) * 100) / 100,
				y: Math.round((rect.top + scrollY) * 100) / 100,
				w: Math.round(rect.width * 100) / 100,
				h: Math.round(rect.height * 100) / 100,
			},
			attributes,
			styles,
		});
	} while ((el = walker.nextNode()));

	return {
		title: document.title,
		url: location.href,
		documentSize: {
			w: document.documentElement.scrollWidth,
			h: document.documentElement.scrollHeight,
		},
		nodes,
	};
}

/**
 * The computed properties captured for every element. Layout first, then the
 * paint properties that make a port "look wrong" when they drift.
 */
export const DEFAULT_STYLE_PROPS = [
	"display",
	"position",
	"flex-direction",
	"flex-wrap",
	"justify-content",
	"align-items",
	"gap",
	"grid-template-columns",
	"grid-template-rows",
	"grid-template-areas",
	"grid-area",
	"overflow-x",
	"overflow-y",
	"z-index",
	"box-sizing",
	"margin",
	"padding",
	"border-radius",
	"border-top",
	"font-family",
	"font-size",
	"font-weight",
	"line-height",
	"text-transform",
	"white-space",
	"color",
	"background-color",
	"background-image",
	"box-shadow",
	"opacity",
];
