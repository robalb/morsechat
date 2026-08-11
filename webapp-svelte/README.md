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
| `utils/dialects.js` | `lib/utils/dialects.ts` (copied, typed) |

## What is not ported yet

Everything that is logic, api or state:

- `redux/` — the three slices are described as types in `lib/state/types.ts`,
  and `lib/state/placeholder.svelte.ts` fakes them so the layout has something
  to render. That file is the only thing that has to be replaced when the real
  state arrives.
- `socket/` — the websocket client, and the code that writes messages into the
  chat dom node.
- `hooks/UseSound.jsx` and the iambic keyer inside `components/key/Key.jsx`.
  `Key.svelte` renders the buttons but they do nothing.
- The auth forms (login, register, verify), the moderation menu, the user
  dialog, the report-message dialog.
- `Preview.jsx`'s morse translation and submit countdown.

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
  value indicator, the `secondary`-coloured radios, the dialog's typographic
  title and content). They are marked as such where they live —
  `controls/controls.css` and the `<style>` block of `settings/Settings.svelte`.
- The react app builds three html entrypoints (`index`, `info`, `user`); the
  last two are placeholder stubs, so only `index` is here.
- `lib/utils/dialects.ts` is a verbatim copy and keeps the duplicate object keys
  the original has. esbuild warns about them on every build. They are a bug in
  the morse tables (`-.-.-` and `-...-` are each defined twice), worth fixing,
  but fixing it here would change behaviour, which is not what a port should do.
