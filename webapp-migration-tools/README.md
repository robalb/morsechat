# webapp-migration-tools

Puppeteer tooling used during the migration of `webapp/` (react + redux + MUI)
to `webapp-svelte/` (svelte + SMUI).

The idea is simple: load both implementations of the same page in a real
browser at a real viewport size, extract every visible element with its bounding
box, attributes and computed styles, then diff the two lists. Layout drift and
missing elements show up as a list you can work through, instead of as a "hmm,
that looks a bit off" while flipping between two tabs.

## Install

```sh
npm install
```

## Use

Start the react app (`cd ../webapp && npm run dev`, port 3000) and the svelte
app (`cd ../webapp-svelte && npm run dev`, port 5173), then:

```sh
# one viewport
node compare.js --old http://localhost:3000 --new http://localhost:5173

# every breakpoint of appLayout.css, plus screenshots
node compare.js --viewport all --shots shots/
```

`compare.js` exits non-zero when the pages differ, so it can gate a CI job.
`--help` on either script lists all the options.

Snapshots can also be taken separately and diffed offline, which is how you
compare against a reference captured before a refactor:

```sh
node snapshot.js --url http://localhost:3000 --viewport desktop --out snapshots/react.desktop.json
node snapshot.js --url http://localhost:5173 --viewport desktop --out snapshots/svelte.desktop.json
node compare.js snapshots/react.desktop.json snapshots/svelte.desktop.json
```

## How elements are matched

Class names are useless here: the react app emits css-modules hashes and MUI
generated classes, the svelte app does not. So elements are paired in three
passes, strongest signal first:

1. **`data-mig`** — an explicit marker. Put the same `data-mig="chat-input"` on
   both implementations when a component is genuinely hard to match.
2. **semantic key** — tag + `role` + `aria-label` + `id` + own text. This is the
   part of the markup the user perceives, and it survives a rewrite well.
3. **structural path** — a class-free `body>div>header>button:1`. The fallback
   for layout wrappers that carry no text and no label.

Each element is consumed by at most one pass, so a well labelled component never
gets mismatched by its position in the tree.

## Reading the output

- **missing in candidate** — the port does not render this element yet. This is
  the list to work through first.
- **only in candidate** — extra elements. Usually harmless wrapper divs, but
  worth a look: SMUI and MUI nest their internals differently.
- **changed** — matched on both sides but different. Sorted worst first, with
  box deltas in pixels, then attribute and computed style differences.

Animations are paused before the snapshot is taken, so the connection status
pill and the typing indicator do not produce phantom diffs.

## Notes

- The default tolerance is 2px. Font rendering and subpixel layout make an exact
  match unrealistic; raise it with `--tolerance` if a run is too noisy.
- The react app fetches its state on load, so what is on screen depends on the
  backend. Point both apps at the same backend, or use `--ignore` to skip the
  parts that are data driven (`--ignore "[data-mig=chat] p"`).
- `--wait` is the reliable way to snapshot after the app has rendered, e.g.
  `--wait "header"`.
