/**
 * How long the parts of a morse character last, at a given speed.
 *
 * This is `wpmToMorseTimes` of webapp/src/redux/userSlice.js and `getTimes` of
 * webapp/src/components/key/Key.jsx, which were the same function written
 * twice, expressed through morse-pro's WPM module so that there is one
 * definition of a dit in the app.
 *
 * The speed is the user's `wpm` setting and nothing else: the app has no
 * adaptive decoding and no Farnsworth spacing, so a message is keyed, decoded
 * and played back against the same fixed number. It is also what the backend
 * decodes with (`1200 / wpm`, backend/internal/morse/decode.go), which is why
 * the sender's preview and the moderation log agree on what was sent.
 */
import * as WPM from '$lib/morse-pro/morse-pro-wpm';

export interface MorseTimes {
  /** a dot, and the gap between two elements of the same letter */
  dot: number;
  dash: number;
  elementGap: number;
  /** the silence that ends a letter */
  letterGap: number;
  /** the silence that ends a word */
  wordGap: number;
}

/** the range the wpm slider offers, and what the backend validates */
const MIN_WPM = 1;
const MAX_WPM = 200;

export function morseTimes(wpm: number): MorseTimes {
  const speed = Math.min(Math.max(wpm, MIN_WPM), MAX_WPM);
  const dot = WPM.ditLength(speed);
  return {
    dot,
    dash: WPM.dahLength(speed),
    elementGap: WPM.ditSpace(speed),
    letterGap: WPM.charSpace(speed),
    wordGap: WPM.wordSpace(speed),
  };
}
