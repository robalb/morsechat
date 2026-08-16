# webapp-migration-tools

Puppeteer tooling used during the migration of `webapp/` (react + redux + MUI)
to `webapp-svelte/` (svelte + SMUI).

Two tools, for the two halves of a port:

- **`compare.js`** — what the apps *look* like. Load both implementations of the
  same page in a real browser at a real viewport size, extract every visible
  element with its bounding box, attributes and computed styles, then diff the
  two lists. Layout drift and missing elements show up as a list you can work
  through, instead of as a "hmm, that looks a bit off" while flipping between
  two tabs.
- **`keyer-test.js`** — what the apps *do*. An automated morse operator keys a
  message into both of them and checks what each read back.

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

## Keying morse into both apps

`keyer-test.js` is the same idea applied to behaviour. It holds a real key down
for real durations — over CDP, so the events are `isTrusted` and get past both
apps' anti-cheat check — and then reads the message preview back:

```sh
node keyer-test.js                          # both apps, every case
node keyer-test.js --old "" --case phrase   # the svelte app, one case
node keyer-test.js --case squeeze --headful # watch it happen
```

It runs on the training channel, so nothing is broadcast and nothing is rate
limited, and it exits non-zero if a case fails **or if the two apps read the
same keying differently**, which is the part worth watching.

The cases:

| case | what it keys | what it should read |
| --- | --- | --- |
| `phrase` | `--text`, "hello world" by default | the phrase |
| `partial` | two dits, read immediately | `..` — the letter is not finished |
| `letter` | two dits, after the letter gap | `i` |
| `unknown` | eight dits | `........`, a code with no letter |
| `autosend` | one dit, then nothing | empty: the countdown sent it |
| `cancel` | one letter, then the bin button | empty |
| `cancelheld` | the bin button *while the key is held*, then a letter | that letter alone |
| `iambic` | the dit paddle held for 750ms | `h`, four dits |
| `squeeze` | both paddles held for 750ms | `r`, dit-dah-dit |
| `dynamic` | "hello world" at **twice** the app's wpm | `...world` — it works the speed out |
| `dynamicstable` | a word fast, then a word at a third of that | the first word, unchanged |
| `dynamicdrift` | a long message from a loose hand, dot-heavy letters last | those letters, read correctly |

`iambic` and `squeeze` switch the app to iambic mode through the settings popup
first, because in iambic mode the timing is the app's and not the operator's:
the paddle only says "keep going".

The last two switch it to "straight (adaptive)" and are svelte-only — the react
app has no such mode, so they are skipped when driving it rather than counted as
drift. Both key at a speed the app was never told about, which is the point of
the mode. `dynamic` only asks for the end of the message: the first character or
two are decoded against the slider, before anything has been measured, and
cannot be right when the slider is this wrong. `dynamicstable` is the real one —
it reads the preview, then keys on at a third of the speed, and fails if the
words already on screen have changed. That is the regression the mode is
designed around, and the reason its decoder never re-reads a character it has
already shown.

`dynamicdrift` covers the other one. Its operator is not a metronome: the gaps
inside a letter run near 1.7 dits instead of 1, and the gaps between letters
near 5 instead of 3, which is what a hand on a straight key actually does and
what `textToSchedule`'s `gap`/`letterGap`/`wordGap` options exist for. Against a
hand like that the first version of the adaptive decoder sank its letter split a
little further with every letter, so the dot-heavy letters at the end of the
message came out as strings of "e" — hence the length of the phrase and the
position of the "hi" and the "sos" in it.

### Why the operator keys 10% slow

`--slop` is how much longer than textbook every duration is, and it defaults to
10%. With `--slop 0` — dits of exactly `1200/wpm` ms — the react app decodes
"hello world" as `......-...... orrr ....-..`, because it decides what a
duration meant with strict inequalities against the exact length (`t >
times.letterGap` ends a letter, `t < times.dash` is a dit), so a gap of exactly
one letter gap is not one. Nobody keys that precisely by hand, which is why it
went unnoticed. The svelte port decodes with morse-pro's thresholds, which sit
halfway between the two lengths they separate, and reads it correctly.

So: the default 10% is inside what both apps accept and makes the parity check
meaningful; `--slop 0` is the case that tells them apart.

### The speed has to match

The preview is decoded against the `wpm` setting, so the operator has to key at
the speed the app is set to. Both apps default an anonymous session to 12 wpm,
which is what `--wpm` defaults to.

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
