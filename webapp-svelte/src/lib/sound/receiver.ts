import { render } from '$lib/morse/decode';
import type { MessageMorse } from '$lib/socket/types';
import { user } from '$lib/state/session.svelte';
import { scrollDown } from '$lib/utils/chatDom';
import getDialect from '$lib/utils/dialects';

import { DEFAULT_FREQUENCY, Tone } from './audio';

export type SoundPermission = (callsign: string) => boolean | undefined;

const active = new Set<() => void>();

export function playMessage(
  message: MessageMorse,
  node: HTMLElement | null,
  allowSound: SoundPermission,
  username: string
) {
  if (!node) return;

  const dialect = getDialect(message.dialect);
  const paragraph = document.createElement('p');
  paragraph.setAttribute('data-signature', message.signature);
  paragraph.setAttribute('data-callsign', message.callsign);
  paragraph.setAttribute('data-username', username);

  const label = document.createElement('span');
  label.innerText = dialect.short_name ? `${message.callsign} [${dialect.short_name}]` : message.callsign;
  const morse = document.createElement('span');
  const text = document.createElement('span');
  paragraph.append(label, morse, text);
  node.insertAdjacentElement('beforeend', paragraph);
  scrollDown(node);

  const buffer = message.message;
  const tone = new Tone(message.frequency || DEFAULT_FREQUENCY, 0);
  const start = Date.now();
  let audible = false;
  let elapsed = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    clearTimeout(timer);
    tone.off();
    tone.disconnect();
    active.delete(stop);
  };

  const step = (i: number) => {
    const done = i >= buffer.length;
    audible = allowSound(message.callsign) ?? audible;
    if (!done && i % 2 === 0 && audible) {
      tone.volume = user.settings.volume_receiver;
      tone.on();
    } else {
      tone.off();
    }

    const options = { wpm: message.wpm, dialect, complete: done };
    const played = buffer.slice(0, i + 1);
    morse.innerText = render(played, { ...options, readable: false });
    text.innerText = render(played, { ...options, readable: true });

    if (done) {
      stop();
      return;
    }
    elapsed += buffer[i];
    timer = setTimeout(() => step(i + 1), Math.max(0, start + elapsed - Date.now()));
  };

  active.add(stop);
  step(0);
}

export function stopPlayback() {
  for (const stop of active) stop();
}
