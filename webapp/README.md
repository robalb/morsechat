# webapp

The morsechat frontend: svelte 5 + SMUI, built with vite.

## Run

```sh
npm install     # also compiles the SMUI theme, via the prepare script
npm run dev     # http://localhost:5173, talks to the backend on :8080
npm run build   # dist/, assets under dist/static/
```

`npm run smui-theme` recompiles `src/theme/smui.css` from
`src/theme/_smui-theme.scss`. `npm install` and `npm run build` run it for you.

## Tests

```sh
npm test
```

The tests import the app's `.ts` modules directly, with node stripping the types
and `test/loader.mjs` resolving `$lib/` and extensionless imports.

End-to-end behaviour (keying morse and reading back what the preview and the
chat render) is covered by `../webapp-harness`.

## Layout

| path | what |
| --- | --- |
| `src/pages/` | the html entrypoint, `main.ts`, the app shell and its grid layout |
| `src/lib/components/` | the ui |
| `src/lib/state/` | session (user, settings) and chat (channel, socket, online users) |
| `src/lib/socket/` | the websocket client |
| `src/lib/morse/` | the keyer, the keybindings, and `decode.ts`: timings to text |
| `src/lib/sound/` | the sidetone and the playback of received messages |
| `src/lib/utils/dialects.ts` | the morse tables |

## Test hooks

- `data-harness="preview-text"`, `"key-left"` and `"key-right"` mark the preview
  and the key buttons.
- In dev builds only, `window.morsechat` exposes `{ chat, user, keyer,
  sendMorseMessage, dialects }`, so a driver can change settings and read the
  key buffer without going through the ui.

## Conventions

**Typescript with no compiler.** `vitePreprocess()` hands `lang="ts"` blocks to
esbuild, which strips the types. There is no `typescript` dependency and no type
checking in the build, so: no `enum`, no `namespace`, no parameter properties,
and every type-only import is written as `import type { … } from …`.

**Styles.** `theme/base.css` and `pages/appLayout.css` stay global, because
`appLayout.css` assigns grid areas to classes that `AppLayout` hands down to
child components. Everything else is a `<style>` block in its component. Two
places need `:global()`: the chat content, which the receiver injects as plain
DOM nodes, and any class handed to an SMUI component.

**Aliases.** `$lib`, `$theme` and `$assets`, defined in `vite.config.js`.

## Notes

- The material icons ligature font is loaded from Google Fonts in `index.html`,
  which is how SMUI expects to get its icons.
- SMUI marks every `<Button>` inside a dialog's `<Actions>` with
  `data-mdc-dialog-action="close"`, so the buttons that act rather than dismiss
  (ban, mute, report) pass `action={null}`.
