import { getSocket, isTrainingChannel, sendMorseMessage } from '$lib/state/chat.svelte';
import { user } from '$lib/state/session.svelte';
import getDialect from '$lib/utils/dialects';

import { dotLength, render } from './decode';
import { matchAction } from './keybinds';

const TYPING_GUARD = 3;
const MAX_PRESS = 1500;
const SUBMIT_IDLE = 600;

type Paddle = 'dot' | 'dash';
type Timer = ReturnType<typeof setTimeout> | undefined;

class Keyer {
  buffer = $state<number[]>([]);
  keyDown = $state(false);
  progress = $state(0);
  tone: { on: () => void; off: () => void } | null = null;

  #letterComplete = $state(false);
  #lastTime = 0;
  #paddles: Record<Paddle, boolean> = { dot: false, dash: false };
  #lastElement: Paddle | null = null;
  #iambicTimer: Timer;
  #letterTimer: Timer;
  #releaseTimer: Timer;
  #submitTimer: Timer;
  #animation: number | undefined;
  #countdownStart = 0;

  text = $derived(
    render(this.buffer, {
      wpm: user.settings.wpm,
      dialect: getDialect(user.settings.dialect),
      readable: user.settings.show_readable,
      complete: this.#letterComplete,
    })
  );

  empty = $derived(this.buffer.length === 0);

  press(isLeft = true) {
    if (user.settings.key_mode !== 'yambic') {
      this.#down();
      return;
    }
    this.#paddles[this.#paddle(isLeft)] = true;
    if (this.#iambicTimer === undefined) this.#iambic();
  }

  release(isLeft = true) {
    if (user.settings.key_mode !== 'yambic') {
      this.#up();
      return;
    }
    this.#paddles[this.#paddle(isLeft)] = false;
  }

  releaseAll() {
    this.#paddles = { dot: false, dash: false };
    this.#lastElement = null;
    clearTimeout(this.#iambicTimer);
    this.#iambicTimer = undefined;
    this.#up();
  }

  #paddle(isLeft: boolean): Paddle {
    return isLeft === user.settings.left_is_dot ? 'dot' : 'dash';
  }

  #nextElement(): Paddle | null {
    const { dot, dash } = this.#paddles;
    if (dot && dash) return this.#lastElement === 'dot' ? 'dash' : 'dot';
    if (dot) return 'dot';
    if (dash) return 'dash';
    return null;
  }

  #iambic() {
    const element = this.#nextElement();
    this.#lastElement = element;
    if (!element) {
      this.#iambicTimer = undefined;
      return;
    }
    const dot = dotLength(user.settings.wpm);
    this.#down();
    this.#iambicTimer = setTimeout(
      () => {
        this.#up();
        this.#iambicTimer = setTimeout(() => this.#iambic(), dot);
      },
      element === 'dot' ? dot : 3 * dot
    );
  }

  #down() {
    if (this.keyDown) return;

    const now = Date.now();
    if (this.#lastTime > 0) this.buffer.push(now - this.#lastTime);
    this.#lastTime = now;
    this.keyDown = true;

    this.#letterComplete = false;
    clearTimeout(this.#letterTimer);
    this.#cancelSubmit();
    this.tone?.on();

    clearTimeout(this.#releaseTimer);
    this.#releaseTimer = setTimeout(() => this.#up(), MAX_PRESS);
  }

  #up() {
    if (!this.keyDown) return;

    const shouldAnnounce = this.buffer.length === TYPING_GUARD * 2;
    const now = Date.now();
    if (this.#lastTime > 0) {
      this.buffer.push(now - this.#lastTime);
      this.#lastTime = now;
    }
    this.keyDown = false;

    clearTimeout(this.#releaseTimer);
    this.tone?.off();

    if (shouldAnnounce && !isTrainingChannel()) getSocket()?.sendTyping(true);

    clearTimeout(this.#letterTimer);
    this.#letterTimer = setTimeout(
      () => (this.#letterComplete = true),
      3 * dotLength(user.settings.wpm)
    );

    this.#scheduleSubmit();
  }

  #scheduleSubmit() {
    this.#cancelSubmit();
    if (this.empty) return;
    this.#submitTimer = setTimeout(() => {
      this.#countdownStart = Date.now();
      this.#animation = requestAnimationFrame(() => this.#tick());
    }, SUBMIT_IDLE);
  }

  #tick() {
    const progress = (Date.now() - this.#countdownStart) / user.settings.submit_delay;
    if (progress < 100) {
      this.progress = progress;
      this.#animation = requestAnimationFrame(() => this.#tick());
      return;
    }
    this.progress = 0;
    void this.#send();
  }

  #cancelSubmit() {
    clearTimeout(this.#submitTimer);
    if (this.#animation !== undefined) cancelAnimationFrame(this.#animation);
    this.#animation = undefined;
    this.progress = 0;
  }

  async send() {
    if (this.empty) return;
    this.#cancelSubmit();
    await this.#send();
  }

  async #send() {
    const message = [...this.buffer];
    if (message.length === 0) return;
    this.reset();
    await sendMorseMessage(message);
  }

  clear() {
    if (this.empty) return;
    this.reset();
    getSocket()?.sendTyping(false);
  }

  reset() {
    this.buffer = [];
    this.#lastTime = 0;
    this.#letterComplete = false;
    clearTimeout(this.#letterTimer);
    this.#cancelSubmit();
  }

  listen(): () => void {
    const down = (e: KeyboardEvent) => this.#handleKey(e, true);
    const up = (e: KeyboardEvent) => this.#handleKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      this.releaseAll();
    };
  }

  #handleKey(e: KeyboardEvent, isDown: boolean) {
    const action = matchAction(e, user.settings.keybinds, user.settings.key_mode);
    if (!action) return;

    if (action === 'cancel') {
      if (isDown) this.clear();
    } else if (action === 'transmit') {
      if (isDown) void this.send();
    } else if (isDown) {
      this.press(action !== 'right');
    } else {
      this.release(action !== 'right');
    }
  }
}

export const keyer = new Keyer();
