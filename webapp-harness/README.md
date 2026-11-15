# webapp-harness

Drives the morsechat webapp from a real Chrome, the way a person would: it holds
keys, clicks, presses with a pen and taps with fingers, at real speed, and
records every render of the message preview and of the chat. The point is to
see what the user sees while they key, not just the end result, so that (for
example) a preview which shows one letter and then replaces it with another is caught.

Everything is a CLI that prints a short report and writes a full log, so it can
be run and read by an LLM as easily as by a person.

## Setup

```sh
cd webapp-harness
npm install          # puppeteer, and the Chrome it drives
./stack.sh up        # backend on :8080 and the webapp dev server on :5173
./stack.sh status
./stack.sh down      # stops only what stack.sh started
```

`stack.sh up` reuses a backend or dev server that is already running. The
harness needs a **dev** build of the webapp: it talks to the app through
`window.morsechat`, which only dev builds expose. The backend only accepts the
origins `localhost:5173` and `localhost:3000`, so `WEB_PORT=3000 ./stack.sh up`
and `--url http://localhost:3000` are the alternative when 5173 is taken.

## Keying: `type.js`

```sh
node type.js                                     # "hello world", keyboard, straight key
node type.js --text "cq de k1abc" --input touch
node type.js --input all --mode all              # every input × straight and iambic
node type.js --mode iambic --squeeze --input keyboard,touch
node type.js --view morse                        # the preview showing dots and dashes
node type.js --dialect russian --text "привет"
node type.js --morse "...---..." --dialect temp_prosign
node type.js --timings 110,110,330,330,110       # a raw key buffer, e.g. one a user sent
node type.js --wobble 0.2 --seed 3               # a less regular hand
node type.js --timeline                          # also print every render
node type.js --help
```

It keys on the `training` channel by default, where nothing is broadcast.

| `--input` | how it presses | how the app sees it |
| --- | --- | --- |
| `keyboard` | CDP key events on the bound keys (`c`, `z`/`x` for the paddles) | `keydown`/`keyup` on window |
| `mouse` | CDP mouse events on the key buttons; `--button right` for a right click | `pointerdown`/`pointerup`, pointerType mouse |
| `pen` | the same with pointerType pen | pointerType pen |
| `touch` | CDP touch events on a phone-sized, touch-enabled viewport; real multi-touch | pointerType touch |

All of them are trusted events, so they pass the app's `isTrusted` check.

| `--mode` | who times the elements |
| --- | --- |
| `straight` | the harness. The message becomes a list of press and gap durations (`--wpm`, `--slop`, `--wobble`, `--gap`, `--letter-gap`, `--word-gap`), played on an absolute clock. |
| `iambic` | the app's keyer. The harness holds paddles and follows the keyer: it waits for each element to show up in the preview before switching paddles, and measures letter gaps from the keyer's last element. `--squeeze` holds both paddles across dit/dah alternations. A mouse or pen cannot squeeze. |

`--slop` (default 0.1) keys everything 10% slower than textbook. Without it, a
dash and a letter gap land exactly on the app's decision thresholds (see below).

## Receiving: `receive.js`

```sh
node receive.js                                   # sender keys "hello world" on ch1
node receive.js --text "sos" --input touch --mode iambic
node receive.js --direct --timings 60,180,180     # skip the key, send a buffer to the socket
```

Two fresh anonymous users join the same channel. One keys (or `--direct` sends)
the message, and the other receives it over the backend and plays it into its
chat log. The harness records both spans of that chat line, morse and text,
and checks them against what was meant and against the sender's own preview.

The backend refuses a new anonymous user's first message for about 5 seconds,
and lets them send one message per 10 seconds (20 above 30 wpm), so a run waits
that out. Five users per IP can be connected at once: close stray browsers.

## Reading the output

```
keyboard / straight — 12 wpm (dot 100ms), text view, international, keys {...}
  keyed     "hello world": .... . .-.. .-.. --- / .-- --- .-. .-.. -..
  driver    64 inputs, up to 1ms late
  preview   "hello  world"  ✓ matches
            release→render ≤ 4ms
            10 letters resolved, 3.0–3.0 dots after their last element
            jitter: none
  timing    app measured 63 durations, max error 14ms vs plan, 0 within 5% of a threshold
  log       runs/<stamp>-keyboard-straight.json runs/<stamp>-keyboard-straight.txt
```

- **driver** is how late the harness itself was. If it is large, distrust the run.
- **preview** is the last text shown, compared after collapsing whitespace.
- **jitter** lists every rewrite: text that was on screen and then changed.
- **timing** compares the durations the app recorded (`keyer.buffer`) with what
  was keyed. Each misread is labelled with its cause. **the hand was ambiguous**
  means the keyed duration itself was on the wrong side of a threshold.
  **lost between the input and the app** means it was keyed right and arrived
  wrong.

The `.txt` log holds the report and a timeline of every input and render:

```
  t(ms)  input     text                                change
    121  ↓ key
    126            " ."                                grow   [press 115ms = 1.15 dots]
   1074            "h"                                 resolve "...." → "h"
   6164            "hello  "                           append +"  "   [gap 770ms = 7.70 dots]
```

Every render is classified against the one before it:

| change | meaning |
| --- | --- |
| `grow` | the letter being keyed got another dot or dash |
| `resolve` | that letter was replaced by the character it decodes to |
| `append` | text was added after what was already there |
| `clear` | the preview emptied: the message was sent or cancelled |
| `rewrite` | **jitter**: text already on screen changed or disappeared |

In the text view the letter being keyed is the trailing run of dots and dashes,
so `"he .–"` → `"hel"` is a resolve, and `"hel"` → `"he"` is a rewrite. The
`.json` log has everything, including the app's buffer at every render, and
`node analyze.js <log>.json [--timeline]` re-runs the analysis on it.

Exit codes: `type.js` and `receive.js` exit 1 when any run renders the wrong
text, rewrites text, or clears the preview mid-message. `npm run check` runs
the whole matrix, `npm test` tests the analysis itself.

## How the app decodes, for reference

`webapp/src/lib/morse/decode.ts`, the same in the preview and the receiver: a
dot is `floor(1200 / wpm)` ms. A press shorter than 3 dots is a dot and a
longer one is a dash. A gap of 3 dots ends a letter, and a gap of 7 ends a word.
The preview shows the letter being keyed as dots and dashes until 3 dots of
silence have passed. It sends the message after 600 ms of silence plus a
`submit_delay × 100` ms countdown, which at low wpm can fire inside a word gap.
