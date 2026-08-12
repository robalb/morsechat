/**
 * Stand-in for the redux store, for the duration of the migration.
 *
 * The react components read the state through `useSelector`. Their svelte
 * counterparts read it from here instead, so that the day the real state
 * arrives (stores backed by the api and the websocket) only this file is
 * replaced, and no component has to be touched.
 *
 * The values are the redux `initialState` of each slice, with enough fake
 * online users and enough of a chat log to make the layout show its real
 * proportions at every breakpoint.
 *
 * What is left here is the websocket's half of the state: the chat and the
 * online users. The session — `user` and `api` — has moved to
 * session.svelte.ts, where it is backed by the rest api for real, and the user
 * profiles are now fetched from lib/api/client.ts (stubbed, but a request).
 */
import type { ChatState } from './types';

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
      is_anonymous: false,
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
