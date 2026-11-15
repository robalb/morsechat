import { tick, untrack } from 'svelte';

import { SocketClient } from '$lib/socket/client';
import type { MessageMorseStatus, WsUser } from '$lib/socket/types';
import { playMessage, stopPlayback } from '$lib/sound/receiver';
import { systemMessage } from '$lib/utils/chatDom';

import { api, initSession, user } from './session.svelte';
import type { ChatState, ConnectionStatus, OnlineUser } from './types';

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
  connected: false,
  connectionStatus: 'powering on',
  onlineUsers: {},
  myID: null,
});

/** the channel where nothing is broadcast, and messages stay in the browser */
const TRAINING_CHANNEL = 'presence-training';

/**
 * Whether we are in the channel that broadcasts nothing.
 *
 * The keyer asks before announcing that it is typing, and the send path asks
 * before sending: on training both are noise about a message nobody will
 * receive.
 */
export function isTrainingChannel(): boolean {
  return chat.channel === TRAINING_CHANNEL;
}

/* ------------------------------------------------------------------ *
 * Channel
 * ------------------------------------------------------------------ */

/** The readable name of a channel — what the header and the url call it. */
export function channelName(ch: string = chat.channel): string | undefined {
  return chat.channels.find((current) => current.ch === ch)?.name;
}

/** Selects a channel by its readable name, ignoring one that does not exist. */
export function setChannelByName(name: string) {
  const found = chat.channels.find((current) => current.name === name);
  if (found) {
    chat.channel = found.ch;
  }
}

/* ------------------------------------------------------------------ *
 * Connection state
 * ------------------------------------------------------------------ */

function setConnected(status: ConnectionStatus) {
  // `connecting` counts as connected: the pill is what tells the two apart,
  // and everything else in the app only asks whether the socket is worth
  // sending to soon
  chat.connected = status === 'connected' || status === 'connecting';
  chat.connectionStatus = status;
}

/* ------------------------------------------------------------------ *
 * Online users
 * ------------------------------------------------------------------ */

function updateOnline(users: WsUser[]) {
  const me = user.callsign;
  const next: Record<string, OnlineUser> = {};
  for (const u of users) {
    const existing = chat.onlineUsers[u.callsign];
    // our own key is not played back to us, so it starts muted
    let allowSound = u.callsign !== me;
    if (existing) allowSound = existing.allowSound;

    next[u.callsign] = {
      is_anonymous: u.is_anonymous,
      callsign: u.callsign,
      username: u.username,
      typing: existing?.typing ?? false,
      allowSound,
    };
  }
  chat.onlineUsers = next;
  chat.myID = me;
}

function setTyping(callsign: string, typing: boolean) {
  const target = chat.onlineUsers[callsign];
  if (target) {
    target.typing = typing;
  }
}

/* ------------------------------------------------------------------ *
 * The socket
 * ------------------------------------------------------------------ */

let client: SocketClient | null = null;

export function getSocket(): SocketClient | null {
  return client;
}

/** the chat log of each channel, kept so that switching back restores it */
const chatHistory: Record<string, string> = {};

/**
 * How the log is reached from outside the connection code. The send path writes
 * its failures into the chat as system lines, and it is called by the keyer,
 * which has no component and no node of its own.
 */
let chatNode: () => HTMLElement | null = () => null;

function createClient(initialChannel: string, getChatNode: () => HTMLElement | null) {
  const socket = new SocketClient(initialChannel);

  socket.onStateChange = (state) => {
    setConnected(state);
    if (state === 'unavailable') {
      // the server is down, or it rejected our credentials. If it was the
      // credentials, opening the session again is what gets us a fresh cookie,
      // and the new callsign restarts the connection through the effect below.
      void initSession();
    }
  };

  socket.onTyping = (message) => {
    setTyping(message.callsign, message.typing);
  };

  socket.onMemberAdded = (message) => updateOnline(message.users);
  socket.onMemberRemoved = (message) => updateOnline(message.users);

  socket.onSubscriptionSuccess = async (message) => {
    setConnected('connected');
    updateOnline(message.users);

    // The log is not always on screen: <Chat> shows an error card instead
    // whenever a join was refused, and the node comes back only once the state
    // written just above has been rendered. Joining a working channel after a
    // refused one arrives in exactly that gap, so the line waits for the dom.
    await tick();
    const node = getChatNode();
    if (!node || node.childElementCount > 0) return;

    const name = channelName();
    systemMessage(node, `connected to ${name} with callsign: ${user.callsign}`);
    if (chat.channel === TRAINING_CHANNEL) {
      systemMessage(
        node,
        "This is a training channel. The messages that you type won't be broadcasted"
      );
    }
  };

  socket.onSubscriptionError = (message) => {
    if (message.error === 'invalid_credentials') {
      setConnected('connection denied');
    } else if (message.error === 'too_many_users') {
      setConnected('connection busy');
    } else {
      setConnected('connection failed');
    }
    // we are in no channel, so there is nobody to list
    updateOnline([]);
  };

  socket.onMessage = (message) => {
    setTyping(message.callsign, false);
    playMessage(
      message,
      getChatNode(),
      (callsign) => chat.onlineUsers[callsign]?.allowSound,
      chat.onlineUsers[message.callsign]?.username ?? ''
    );
  };

  // the acknowledgement of our own broadcast, which sendMorseMessage() is
  // waiting on. Anything arriving with nobody waiting is an answer to a send
  // that already gave up, and there is nothing left to tell.
  socket.onMessageStatus = (status) => {
    const waiting = pendingStatus;
    pendingStatus = null;
    waiting?.(status);
  };

  return socket;
}

/* ------------------------------------------------------------------ *
 * Sending
 * ------------------------------------------------------------------ */

/**
 * How a send ends: with the server's answer, with nothing after ten seconds, or
 * with another message having taken its place in the queue.
 */
type SendOutcome = MessageMorseStatus | 'timeout' | 'superseded';

/** resolves the send that is waiting for its acknowledgement, if there is one */
let pendingStatus: ((outcome: SendOutcome) => void) | null = null;

const STATUS_TIMEOUT = 10000;

function sendErrorMessage(error: string, details: string): string {
  switch (error) {
    case 'too_many_requests':
      return 'You are sending too many messages, please wait some seconds';
    case 'invalid_message':
      return 'You may be using an old version of the website. Try refreshing the page';
    case 'unauthorized':
      return 'Your session may have expired. Try refreshing the page';
    default:
      return `${error} ${details}`;
  }
}

export async function sendMorseMessage(message: number[]): Promise<void> {
  // on training the message was never going anywhere: it stays in this browser
  if (isTrainingChannel()) return;

  const node = chatNode();
  if (!client || chat.connectionStatus !== 'connected') {
    systemMessage(node, 'Failed to reach the server, trying to reconnect...');
    return;
  }

  const outcome = await new Promise<SendOutcome>((resolve) => {
    // A message sent while the one before it is still unanswered ends that
    // one's wait: there is a single status channel, and what comes back over it
    // now is about this message. Nothing is said about the superseded one — it
    // was sent, and the user has moved on.
    pendingStatus?.('superseded');
    pendingStatus = resolve;
    setTimeout(() => {
      if (pendingStatus === resolve) {
        pendingStatus = null;
        resolve('timeout');
      }
    }, STATUS_TIMEOUT);

    client!.sendMessage({
      message,
      dialect: user.settings.dialect,
      wpm: user.settings.wpm,
      frequency: user.settings.key_frequency,
    });
  });

  if (outcome === 'superseded') return;
  if (outcome === 'timeout') {
    systemMessage(node, 'broadcast failed. The server did not answer');
    return;
  }
  if (!outcome.ok) {
    systemMessage(
      node,
      `broadcast failed. ${sendErrorMessage(outcome.error, outcome.details)}`
    );
  }
}

export function connectSocket(getChatNode: () => HTMLElement | null) {
  // the send path writes into the log too, and it is called from the keyer
  chatNode = getChatNode;

  /**
   * The connection itself. A change of callsign — logging in, logging out —
   * means the identity the server has for this socket is stale, so the
   * connection is dropped and comes back with the new one.
   */
  $effect(() => {
    const loading = api.loading;
    // read it: this effect is what a change of identity re-runs
    user.callsign;

    if (loading) return;
    if (client) {
      client.refresh();
      return;
    }
    // untracked: the channel has an effect of its own, and reconnecting the
    // socket every time one is picked would be a rather expensive way to join
    client = untrack(() => createClient(chat.channel, getChatNode));
  });

  /**
   * The channel. Each one keeps its own log: leaving a channel stores what is
   * on screen, and coming back puts it there again — except for training,
   * whose messages were never anywhere but this browser and are not worth
   * bringing back.
   */
  $effect(() => {
    const channel = chat.channel;
    if (!client) return;

    untrack(() => {
      stopPlayback();

      // What is on screen belongs to the channel we are leaving, and it has to
      // be read now, before anything replaces it.
      const node = getChatNode();
      if (node) {
        chatHistory[client!.channel] = node.innerHTML;
      }
      client!.subscribe(channel);

      // Putting the new channel's log up waits for the dom, for the reason
      // given in onSubscriptionSuccess: coming back from a refused channel,
      // the log node does not exist yet at this point. This still runs before
      // the status line — it was scheduled first — so the line lands under a
      // restored log rather than being wiped by it.
      void tick().then(() => {
        const target = getChatNode();
        if (!target) return;
        if (chatHistory[channel] && channel !== TRAINING_CHANNEL) {
          target.innerHTML = chatHistory[channel];
          target.scrollTop = target.scrollHeight;
        } else {
          target.innerHTML = '';
        }
      });
    });
  });

  $effect(() => {
    const name = channelName(chat.channel);
    if (!name) return;
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('channel', name);
    history.pushState(null, '', `${window.location.pathname}?${searchParams}`);
  });
}
