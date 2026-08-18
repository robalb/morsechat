# webapp-svelte

The svelte port of `webapp/`. Work in progress: **this is the layout only.**

## Run

```sh
npm install     # also compiles the SMUI theme, via the prepare script
npm run dev     # http://localhost:5173
npm run build
```

`npm run smui-theme` recompiles `src/theme/smui.css` from
`src/theme/_smui-theme.scss`. It only needs re-running when the theme changes;
`npm install` and `npm run build` do it for you.

## What is ported

The layout, the page styles, and the component tree. Every component of the
react app has a counterpart here with the same markup, the same class names and
the same breakpoints, so the two pages can be diffed with
`../webapp-migration-tools`.

| react | svelte |
| --- | --- |
| `pages/App.jsx` | `pages/App.svelte` |
| `pages/AppLayout.jsx` | `pages/AppLayout.svelte` |
| `pages/appLayout.css` | `pages/appLayout.css` (copied unchanged) |
| `pageRender/pageRender.jsx` | `pages/main.ts` |
| `pageRender/base.css` | `theme/base.css` |
| `pageRender/theme.js` | `theme/_smui-theme.scss` |
| `components/header/Header.jsx` | `lib/components/header/Header.svelte` |
| `components/info/Info.jsx` | `lib/components/info/Info.svelte` |
| `components/online/Online.jsx` | `lib/components/online/Online.svelte` |
| `components/controls/controls.jsx` | `lib/components/controls/*.svelte` |
| `components/preview/Preview.jsx` | `lib/components/preview/Preview.svelte` |
| `components/chat/Chat.jsx` | `lib/components/chat/Chat.svelte` |
| `components/key/Key.jsx` | `lib/components/key/Key.svelte` |
| `components/sheet/Sheet.jsx` | `lib/components/sheet/Sheet.svelte` |
| `components/settings/Settings.jsx` | `lib/components/settings/Settings.svelte` |
| `components/auth/Auth.jsx` | `lib/components/auth/Auth.svelte` |
| `components/user/User.jsx` | `lib/components/user/User.svelte` |
| `components/report/ReportMessage.jsx` | `lib/components/report/ReportMessage.svelte` |
| `components/moderation/*.jsx` | `lib/components/moderation/*.svelte` |
| `utils/dialects.js` | `lib/utils/dialects.ts` (copied, typed) |

| `redux/{apiSlice,userSlice}.js` | `lib/state/session.svelte.ts` |
| `redux/chatSlice.js` | `lib/state/chat.svelte.ts` + `lib/morse/keyer.svelte.ts` |
| `redux/dialogSlice.ts` | `lib/components/moderation/banDialog.svelte.ts` |
| `socket/` | `lib/socket/` |
| the keyer inside `components/key/Key.jsx` | `lib/morse/keyer.svelte.ts` |
| `Preview.jsx`'s translation and countdown | `lib/morse/`, same file |

## What is new here

**The adaptive straight key**, `lib/morse/window.ts`, offered in the advanced
settings as plain "straight", beside "straight (fixed wpm)" and "iambic A". The
react app decoded the preview against the wpm slider and nothing else; this mode
measures the speed from the keying instead, so an operator who does not hold a
steady speed — which is every beginner — reads back as what they meant. It is
the default here, and while it is on there is no wpm slider in the controls: the
setting is still there and still what a message goes out at, but nothing the
operator sees moves with it.

What makes it non-trivial is that a live preview cannot re-decode what it has
already shown. Measure the whole message and decode against the measurement and
the first word turns into "eeee" the moment the operator slows down. Every
forward decoder tried here — a causal adaptation of Yang et al. 2000, three
variants of Guenther 1973 — pays for that promise by deciding each element at
the worst possible moment, before the elements that would have explained it
exist, and four dots from a hand that pauses inside its letters read as "eeee"
and stay that way.

The window search buys the promise a different way. It reads a window of
elements as a group and searches three thresholds — which presses are dashes,
which silences end a letter, which end a word — taking the candidates from the
window's own durations and keeping the reading whose clusters are tightest and
whose letters are letters. It is allowed to change its mind on screen for the
first four letters of a message, where the speed is genuinely unknown and nobody
has started reading; after that a letter is frozen one letter behind the
frontier and never touched again. That is a letter of latency in exchange for
being able to prefer an "h" over four "e"s, which nothing deciding one element
at a time can do.

It is client-side only, deliberately. The buffer that gets sent is the same
either way, and the receiver and the backend still read a message at the
sender's `wpm` setting, so a message keyed far from the slider reads differently
at the other end than it did in the preview. Making the two agree means sending
a measured speed with the message, which is a wire format change and a separate
piece of work.

Two harnesses cover it: the `dynamic`, `dynamicstable` and `dynamicdrift` cases
of `webapp-migration-tools/keyer-test.js` drive the real app in a browser, and
`test/window.test.ts` keys a hundred generated hands straight into the decoder
for when a constant in it needs tuning.

**The decoder playground**, `/playground.html` — a second vite entry, not linked
to from the app, source under `lib/playground/`. It is the workbench the dynamic
work needs and neither harness provides: one straight key, and every decoding
algorithm reading it at once, in a column of the real preview boxes.

Its two rules are what make it worth having. Live keying and replay go through
the same path, so a box cannot tell which it is showing — a hand keyed once can
be run against an algorithm written a month later. And nothing on screen is
cleared by a message *ending*; only starting a new one clears, because the
comparison is the point and one you have to catch mid-flight is no use.

What it is really for is the failure that has no name in an accuracy score:
a letter that was read correctly, shown to the operator, and then silently
rewritten two letters later. `global average` is in the register to demonstrate
it — its estimate is the best single number available for the whole message, and
that is exactly why speeding up turns the word behind you into "tttt tt".

Three algorithms are in the register: the slider, the whole-message average and
the window search. Five more were there while the choice was being made — a
streaming global average, a causal adaptation of Yang et al. 2000, and three
variants of Guenther's 1973 thesis (`786492.pdf`) — and are in the history if
the comparison ever needs re-running. Keeping them meant maintaining five
algorithms nothing was going to ship.

**The whole-message average** (`lib/morse/average.ts`, box `global average
simple`) is not a live decoder at all: it is what the receiver and the server
should run. A message arrives complete, so it is measured once and decoded once
— `measure` then `decodeBuffer` — and there is no adapting, no window and no
state. It is a streaming global average with the streaming taken out, which
is the whole point: that one re-measures after every element, so its `h` spends
the first second of a message as `eeee` because at that moment the four dots
*are* the message. The only change to the arithmetic is that the split between
short and long presses is iterated to a fixed point and refused when the two
sides are less than 1.8 apart — a message of nothing but dots has a mean too,
and splitting at it reports a hand twice as fast as the one that keyed it.

Its box reads out as letters while the message is being keyed, like every other
translator, with one exception: it will not show letters until the presses have
fallen into two groups. Before the first dash there is nothing to measure a dot
against, so every press is a dot and the only reading available is `eeee` for
what is about to be an `h` — so the elements stay elements for that first second
and become letters the moment there is something to decide them with. The
harness measures this directly as `phantom`, the longest run of `e`s or `t`s
ever shown that is not in the final answer: `global average` scores 1 there and
this scores 0, at the same accuracy.

**The window search** (`lib/morse/window.ts`) is the odd one out and currently
the best reader on the page — 98% against the corpus where nothing else clears
81%, and the only one that reads the fast-hand recording every other decoder
opens with a run of `e`s. It does
not decide an element when the element arrives. It holds a window, tries every
sensible set of three thresholds (dash, letter gap, word gap) taken from the
jumps in the window's own durations, and keeps the reading whose clusters are
tightest *and* whose output is letters — `h` beats four `e`s because four `e`s
cost more, not because a threshold happened to land right. It pays for that in
two currencies: the first four letters of a message may be re-read on screen
(after that the text is frozen behind a one-letter window and never changes),
and the last letter lands about a second after the key comes up.

Recordings live in `lib/playground/recordings.ts`, in source and not in local
storage: a corpus that judges an algorithm belongs in git next to it, reviewable
as a diff, or a tuning change gets compared against a set that quietly differs
from the one it was tuned on. The loop is manual — key, save, type in what you
meant, press "copy new recordings", paste into that file. `expected` is the one
field nothing on the page can fill in, and a recording without it can be
replayed but not scored.

## Tests

```sh
npm test        # node --test, no browser, ~1s
```

`test/decoders.test.ts` runs the playground's corpus through the playground's
decoders without the playground: `test/harness.ts` types each recording into a
decoder as the engine does — sound, silence, and the idle ticks in between,
counted out rather than waited for — and scores the replay on the three things
the page exists to show. **churn**, text that was on screen and then changed,
which must be zero for the causal decoder and is the reason it exists;
**e/t runs**, the `eeee`/`tttt` a message collapses into when the split is in
the wrong place; and **accuracy** against the hand-typed `expected`, last,
because accuracy bought with churn is not worth having. A summary table of all
three algorithms is printed on every run, passing or not.

`global average` is asserted to *fail* — if it ever stops rewriting text, the
harness has stopped measuring rewrites rather than the algorithm having improved.

The tests import the app's `.ts` modules directly, with node stripping the types
and `test/loader.mjs` doing the one thing vite does that node does not: resolving
`$lib/` and extensionless imports. So what runs is the shipped source, not a
compiled copy of it that can drift.

## What is not ported yet

- **The sound engine.** `hooks/UseSound.jsx` (the key's sidetone) and
  `utils/ReceiverSound.js` (playing a received message into the chat at the
  sender's speed). The keyer has the seam ready for the first — `keyer.tone` —
  and `chat.svelte.ts`'s `socket.onMessage` has the TODO for the second, which
  is why a received message currently only clears its sender's typing dots.
- The verification form.
- The keybindings panel still edits its own copy of the bindings rather than
  `user.settings.keybinds`: it holds a list of keys per action, and the api
  takes one key per action (`min=1,max=2` in the go schema). The keyer reads the
  settings, so wiring the panel to them is all that is missing — but the wire
  format has to grow first, or the panel has to lose the extra keys.

## Conventions

**Typescript with no compiler.** `vitePreprocess()` hands `lang="ts"` blocks to
esbuild, which strips the types. There is deliberately no `typescript`
dependency and no type checking in the build. The consequences are the usual
esbuild ones: no `enum`, no `namespace`, no parameter properties, and every
type-only import written as `import type { … } from …`.

**Styles.** `theme/base.css` and `pages/appLayout.css` stay global, because they
are the layout: `appLayout.css` assigns grid areas to classes that `AppLayout`
hands down to child components, which svelte's scoped styles could not reach.
Everything that was a `*.module.css` became a `<style>` block in its component
instead — same rules, same class names.

Two places need `:global()`: the chat content, because the socket injects those
nodes and they never get svelte's scoping class, and any class handed to an SMUI
component, because it lands on markup this component does not own.

**Render props → snippets.** Where the react version passed jsx through props
(`leftContent`, `settingsButton`, `leftButton`), this uses snippets.

**Aliases.** `$lib`, `$theme` and `$assets`, defined in `vite.config.js`.

## Notes

- The material icons ligature font is loaded from Google Fonts in
  `index.html`, which is how SMUI expects to get its icons.
- A handful of rules have no counterpart in the react css: they undo an mdc
  default that MUI does not have (the slider's 24px side margin, the near-black
  value indicator, the `secondary`-coloured radios and switch, the dialog's
  typographic title and content, the outlined-button border). They are marked
  as such where they live — `controls/controls.css`, `theme/base.css` and the
  `<style>` blocks of `settings/Settings.svelte` and `header/Header.svelte`.
- Two class names had to change, because `controls.css` is global where the
  react `controls.module.css` was hashed. `Sheet`'s inner `controls` div is
  `bar` here, and the `.controls div { display: flex }` descendant rule is
  matched to `.control-row` / `.radio-row` instead. Both were reaching markup
  the react rule never could: SMUI keeps its slider, select and menu internals
  inside the component, where MUI portals them onto `<body>`.
- The react app builds three html entrypoints (`index`, `info`, `user`); the
  last two are placeholder stubs, so only `index` is here.
- SMUI marks every `<Button>` inside a dialog's `<Actions>` with
  `data-mdc-dialog-action="close"`, so mdc closes the dialog on any click in
  that row. MUI does not, so the buttons that act rather than dismiss —
  ban, mute, report — pass `action={null}`.
- `lib/utils/dialects.ts` is a verbatim copy and keeps the duplicate object keys
  the original has. esbuild warns about them on every build. They are a bug in
  the morse tables (`-.-.-` and `-...-` are each defined twice), worth fixing,
  but fixing it here would change behaviour, which is not what a port should do.
