import { keyer } from '$lib/morse/keyer.svelte';
import { user } from '$lib/state/session.svelte';

import { Tone } from './audio';

/**
 * Gives the chat keyer the tone it sounds while the key is down, and keeps it
 * in step with `user.settings.key_frequency` and `user.settings.volume_key`.
 *
 * Writes `keyer.tone`, and clears it again when the caller is destroyed. Must
 * be called during component initialisation: it registers effects.
 */
export function startSidetone() {
  const tone = new Tone(user.settings.key_frequency, user.settings.volume_key);
  keyer.tone = tone;

  $effect(() => {
    tone.frequency = user.settings.key_frequency;
    tone.volume = user.settings.volume_key;
  });

  $effect(() => () => {
    keyer.tone = null;
    tone.disconnect();
  });
}
