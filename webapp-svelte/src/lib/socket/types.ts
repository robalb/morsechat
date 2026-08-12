/**
 * The websocket wire protocol.
 *
 * Every type here is one of the structs of
 * backend/internal/wsserver/client_apischema.go, which is the file to keep this
 * in step with. The react app documented the same shapes in jsdoc comments on
 * the callback setters of socket/client.js; they are declared once here
 * instead, so that a handler that reads a field the server does not send is a
 * type error rather than an undefined at runtime.
 */

/* ------------------------------------------------------------------ *
 * Commands — what the client sends
 * ------------------------------------------------------------------ */

export interface CommandJoin {
  type: 'join';
  body: { name: string };
}

export interface CommandTyping {
  type: 'typing';
  body: { typing: boolean };
}

/** the body of a morse broadcast: the key buffer, and how to play it back */
export interface MorseMessageBody {
  dialect: string;
  wpm: number;
  /** alternating key-down / key-up durations in ms */
  message: number[];
  frequency: number;
}

export interface CommandMorse {
  type: 'message';
  body: MorseMessageBody;
}

export type Command = CommandJoin | CommandTyping | CommandMorse;

/* ------------------------------------------------------------------ *
 * Broadcasts — what the server sends
 * ------------------------------------------------------------------ */

/** a member of a channel, as the server describes them */
export interface WsUser {
  is_anonymous: boolean;
  callsign: string;
  /** empty when the user is anonymous */
  username: string;
  is_typing: boolean;
}

/**
 * Someone joined the channel. Also the acknowledgement of one's own join: the
 * message is broadcast to the whole channel, the joiner included, and carries
 * the full member list either way.
 */
export interface MessageJoin {
  type: 'join';
  channel: string;
  users: WsUser[];
  newuser: WsUser;
}

/** Someone left. Carries the member list as it now stands. */
export interface MessageLeave {
  type: 'leave';
  channel: string;
  users: WsUser[];
  left: WsUser;
}

/**
 * A join was refused, and the client is still in whatever channel it was in.
 * `error` is one of `invalid channel name`, `invalid_credentials` (a pro
 * channel, anonymously) or `too_many_users` (the channel, the ip or the device
 * is over its cap).
 */
export interface MessageJoinError {
  type: 'joinerror';
  rejected_channel: string;
  error: string;
}

export interface MessageTyping {
  type: 'typing';
  typing: boolean;
  callsign: string;
}

/** A morse message from another member of the channel. */
export interface MessageMorse {
  type: 'message';
  callsign: string;
  dialect: string;
  wpm: number;
  frequency: number;
  message: number[];
  /** encrypted proof of who sent it; what a report is filed against */
  signature: string;
}

/** The result of one's own morse broadcast. */
export interface MessageMorseStatus {
  type: 'messagestatus';
  ok: boolean;
  error: string;
  details: string;
}

export type ServerMessage =
  | MessageJoin
  | MessageLeave
  | MessageJoinError
  | MessageTyping
  | MessageMorse
  | MessageMorseStatus;

/**
 * The connection state of the client.
 *
 * `connecting` covers both halves of getting online — the websocket handshake
 * and the channel subscription that follows it — because from the user's point
 * of view they are one wait. `unavailable` is a connection that was refused or
 * a server that is not answering; `disconnected` is one that was closed.
 */
export type SocketState =
  | 'initialized'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'disconnected';
