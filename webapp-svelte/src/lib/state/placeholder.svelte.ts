/**
 * Stand-in for the redux store, for the duration of the layout port.
 *
 * The react components read the state through `useSelector`. Their svelte
 * counterparts read it from here instead, so that the day the real state
 * arrives (stores backed by the api and the websocket) only this file is
 * replaced, and no component has to be touched.
 *
 * The values are the redux `initialState` of each slice, with enough fake
 * online users and enough of a chat log to make the layout show its real
 * proportions at every breakpoint.
 */
import type { ApiState, ChatState, UserProfile, UserState } from './types';

export const user: UserState = $state({
  authenticated: false,
  isadmin: false,
  ismoderator: false,
  callsign: 'IU2ABC',
  country: 'it',
  id: null,
  username: null,
  show_popup: false,
  settings: {
    wpm: 12,
    key_frequency: 440,
    volume_receiver: 50,
    volume_key: 50,
    dialect: 'international',
    key_mode: 'straight',
    show_readable: true,
    left_is_dot: true,
    submit_delay: 12,
    keybinds: {
      straight: 'c',
      yambic_left: 'z',
      yambic_right: 'x',
      cancel_message: 'p',
    },
  },
});

export const chat: ChatState = $state({
  channel: 'presence-ch1',
  channels: [
    { ch: 'presence-training', name: 'training' },
    { ch: 'presence-ch1', name: 'ch1' },
    { ch: 'presence-ch2', name: 'ch2' },
    { ch: 'presence-ch3', name: 'ch3' },
    { ch: 'presence-ch4', name: 'ch4' },
    { ch: 'presence-ch5', name: 'ch5' },
    { ch: 'presence-ch6', name: 'ch6' },
    { ch: 'presence-pro-1', name: 'pro1' },
    { ch: 'presence-pro-2', name: 'pro2' },
    { ch: 'presence-pro-3', name: 'pro3' },
  ],
  connected: true,
  connectionStatus: 'connected',
  myID: 'IU2ABC',
  onlineUsers: {
    IU2ABC: {
      is_anonymous: true,
      typing: false,
      allowSound: true,
      username: '',
      callsign: 'IU2ABC',
    },
    G4XYZ: {
      is_anonymous: false,
      typing: true,
      allowSound: true,
      username: 'sparks',
      callsign: 'G4XYZ',
    },
    JA1QRP: {
      is_anonymous: true,
      typing: false,
      allowSound: false,
      username: '',
      callsign: 'JA1QRP',
    },
  },
  messageBuffer: [],
  keyDown: false,
});

export const api: ApiState = $state({
  loading: false,
  error: '',
});

/** Fake chat log. The real one is written into the dom directly by the socket. */
export const placeholderMessages = [
  { callsign: 'G4XYZ', morse: '-.-. --.-  -.-. --.-', text: 'cq cq' },
  { callsign: 'JA1QRP', morse: '.-. .-. -.-', text: 'rrk' },
  { callsign: 'IU2ABC', morse: '--. . --.-', text: 'geq' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
  { callsign: 'G4XYZ', morse: '..- .-.  ..... -. -.', text: 'ur 5nn' },
];

/* ------------------------------------------------------------------ *
 * User profiles
 *
 * Deliberately *not* part of `user` or of the `onlineUsers` entries: a
 * profile is a page's worth of statistics that nothing on screen needs
 * until a popup asks for it. When the state migration lands it will be
 * fetched per callsign, as the popup opens; for the layout port it is read
 * straight out of the map below, and the popup takes it as a prop, so that
 * day nothing in the components has to change.
 * ------------------------------------------------------------------ */

/** deterministic 32-bit hash, so a callsign always gets the same fake data */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A year of plausible on-air activity: quiet most days, busier on the
 * weekend, with a couple of dead months. Keyed 'YYYY-MM-DD' in UTC, and
 * days with no activity are simply absent — which is what an endpoint
 * would send rather than 365 zeroes.
 */
function fakeActivity(seed: string, years: number[]): Record<string, number> {
  const activity: Record<string, number> = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const year of years) {
    const day = new Date(Date.UTC(year, 0, 1));
    while (day.getUTCFullYear() === year) {
      const key = day.toISOString().slice(0, 10);
      // nobody has transmitted tomorrow yet: the current year stops at today,
      // and the rest of its grid stays empty, as github's does
      if (key > today) break;
      const r = hash(seed + key) / 0xffffffff;
      // weekends are roughly twice as likely to carry a session
      const chance = day.getUTCDay() % 6 === 0 ? 0.55 : 0.28;
      if (r < chance) {
        activity[key] = 1 + Math.floor((r / chance) ** 2 * 22);
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }
  }
  return activity;
}

/** The profiles the fake endpoint knows about, by callsign. */
export const placeholderProfiles: Record<string, UserProfile> = {
  G4XYZ: {
    callsign: 'G4XYZ',
    username: 'sparks',
    joined: '2023-06-14',
    met_users: 412,
    met_countries: 37,
    activity: fakeActivity('G4XYZ', [2023, 2024, 2025, 2026]),
  },
  IU2ABC: {
    callsign: 'IU2ABC',
    username: 'alberto',
    joined: '2024-11-02',
    met_users: 128,
    met_countries: 19,
    activity: fakeActivity('IU2ABC', [2024, 2025, 2026]),
  },
};
