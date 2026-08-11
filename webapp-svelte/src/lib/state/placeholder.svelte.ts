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
import type { ApiState, ChatState, UserState } from './types';

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
];
