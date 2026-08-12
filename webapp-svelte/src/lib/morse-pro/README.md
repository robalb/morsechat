# morse-pro (vendored subset)

The parts of [morse-pro](https://github.com/scp93ch/morse-pro) v2.0.0 by Stephen
C. Phillips that this app uses, copied in rather than depended on.

Vendored because we need four of the sixteen modules, and the four we need have
to be cut away from the two things the library ties them to: the Web Audio
player (`morse-pro-player-waa`, which owns its own AudioContext and would fight
with `lib/morse/` over when a tone starts) and the international-only lookup
table of `morse-pro.js` (this app has dialects — russian, wabun, prosign — and
the table has to come from `lib/utils/dialects.ts`).

Everything here keeps its EUPL-1.2 licence header. The licence is in
`LICENSE-EUPL.txt`, next to this file, and it requires that modifications are
stated: they are, per file, below and in a `MODIFICATIONS` comment at the top of
each source file.

| file | upstream | changed |
| --- | --- | --- |
| `morse-pro-wpm.ts` | `src/morse-pro-wpm.js` | types only |
| `morse-pro-decoder.ts` | `src/morse-pro-decoder.js` | `morse2text` is injected instead of imported, so the dialect decides what a code means; constructor takes an options object; added `pendingMorse` |
| `morse-pro-keyer.ts` | `src/morse-pro-keyer.js` | the sidetone player and the decoder are replaced by two callbacks; added `setSpeed()` |
| `morse-pro-keyer-iambic.ts` | `src/morse-pro-keyer-iambic.js` | types only |

The full library is checked out at the repository root (`morse-pro/`) for
reference; it is not part of the build.

## What each one is for

- **wpm** — the one definition of how long a dit is. `1200 / wpm` ms, which is
  also what `backend/internal/morse/decode.go` uses, so the decode the sender
  sees and the decode the server records agree.
- **decoder** — turns a list of millisecond timings into dots, dashes and text.
  This is the preview.
- **keyer / keyer-iambic** — the timer that turns two held paddles into a stream
  of alternating dits and dahs. This is `key_mode: "yambic"`.

The straight key needs none of them: a press is a press.
