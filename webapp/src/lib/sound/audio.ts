const BASE_GAIN = 0.0000001;

export const DEFAULT_FREQUENCY = 400;

let context: AudioContext | null = null;

/**
 * Returns the page's single AudioContext, creating it on the first call and
 * registering one-shot window listeners that resume it on the first gesture.
 *
 * @returns the shared AudioContext
 */
export function audioContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
    for (const event of ['keydown', 'touchstart', 'mousedown'] as const) {
      window.addEventListener(event, resumeAudio, { once: true, passive: true });
    }
  }
  return context;
}

/** Resumes the shared AudioContext when the autoplay policy has suspended it. */
export function resumeAudio() {
  if (context?.state === 'suspended') void context.resume();
}

export class Tone {
  #frequency: number;
  #volume: number;

  #oscillator: OscillatorNode | null = null;
  #gain: GainNode | null = null;
  #playing = false;

  /**
   * @param frequency - the note, in hz
   * @param volume - 0-100, the scale both volume settings use
   */
  constructor(frequency: number, volume: number) {
    this.#frequency = frequency;
    this.#volume = volume;
  }

  /** Sets the note in hz, applied at once when the oscillator exists. */
  set frequency(hz: number) {
    this.#frequency = hz;
    if (this.#oscillator) {
      this.#oscillator.frequency.setValueAtTime(hz, audioContext().currentTime);
    }
  }

  /** Sets the volume, 0-100, applied at once while the tone is sounding. */
  set volume(value: number) {
    this.#volume = value;
    if (this.#playing) this.#apply(this.#level());
  }

  /**
   * Sounds the tone, building its nodes on the first call and resuming the
   * shared AudioContext.
   */
  on() {
    resumeAudio();
    this.#build();
    this.#playing = true;
    this.#apply(this.#level());
  }

  /** Silences the tone, leaving its nodes in place for the next `on()`. */
  off() {
    if (!this.#gain) return;
    this.#playing = false;
    this.#apply(BASE_GAIN);
  }

  /** Stops the oscillator and takes the nodes out of the audio graph for good. */
  disconnect() {
    this.#oscillator?.stop();
    this.#gain?.disconnect();
    this.#oscillator = null;
    this.#gain = null;
    this.#playing = false;
  }

  /**
   * @returns the gain a sounding tone sits at, never zero: a gain of zero
   * silences the whole graph in some browsers
   */
  #level(): number {
    const volume = Math.min(Math.max(this.#volume, 0), 100);
    return (volume + BASE_GAIN) / 100;
  }

  /** Schedules a gain value on the shared AudioContext clock. */
  #apply(level: number) {
    this.#gain?.gain.setValueAtTime(level, audioContext().currentTime);
  }

  /** Builds the oscillator and gain nodes and starts them, once per tone. */
  #build() {
    if (this.#gain) return;
    const ctx = audioContext();
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = this.#frequency;
    oscillator.type = 'triangle';
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(BASE_GAIN, ctx.currentTime);
    oscillator.start();
    this.#oscillator = oscillator;
    this.#gain = gain;
  }
}

export function frequencyFromCallsign(callsign: string): number {
  const scale = [261, 293, 329, 392, 440];
  const pool = [...scale, ...scale.map((f) => f * 2)];

  let hash = 0;
  for (let i = 0; i < callsign.length; i++) {
    hash = (hash << 5) - hash + callsign.charCodeAt(i);
    hash = hash & hash;
  }
  return pool[Math.abs(hash % pool.length)];
}
