/**
 * Port of webapp/src/socket/client.js.
 *
 * A thin protocol layer over the reconnecting websocket: it parses the frames,
 * dispatches them to one handler per message type, and keeps the connection
 * state — which is the connection *and* the channel subscription, since being
 * online without having joined anything is not a state the app has a use for.
 *
 * It holds no application state and touches no dom: what to do with a member
 * list or a typing flag is state/chat.svelte.ts's business. The one difference
 * from the react version is that the handlers are plain assignable fields
 * (`client.onTyping = …`) instead of the pairs of same-named setters
 * (`client.typing = …`) that assigned them; the setters were an alias, and
 * having one name per handler makes them greppable.
 */
import { wsUrl } from '$lib/api/client';

import { ReconnectingWebSocket } from './reconnectingWebsocket';
import type {
  Command,
  MessageJoin,
  MessageJoinError,
  MessageLeave,
  MessageMorse,
  MessageMorseStatus,
  MessageTyping,
  MorseMessageBody,
  ServerMessage,
  SocketState,
} from './types';

export class SocketClient {
  readonly url: string;
  /** the channel we are in, or trying to get into. Empty when in none. */
  channel: string;

  private ws: ReconnectingWebSocket | null = null;
  private _state: SocketState = 'initialized';

  // Handlers, all optional. Assigned by the owner, called on the way in.
  onMessage: ((message: MessageMorse) => void) | null = null;
  onMessageStatus: ((message: MessageMorseStatus) => void) | null = null;
  onTyping: ((message: MessageTyping) => void) | null = null;
  onSubscriptionSuccess: ((message: MessageJoin) => void) | null = null;
  onSubscriptionError: ((message: MessageJoinError) => void) | null = null;
  onMemberAdded: ((message: MessageJoin) => void) | null = null;
  onMemberRemoved: ((message: MessageLeave) => void) | null = null;
  onStateChange: ((state: SocketState) => void) | null = null;

  constructor(initialChannel: string, url: string = wsUrl) {
    this.url = url;
    this.channel = initialChannel;
    this.connect();
  }

  /** The current state. Writing to it is the client's own business. */
  get state(): SocketState {
    return this._state;
  }

  connect() {
    if (this.ws) {
      console.warn('WebSocket is already connected.');
      return;
    }

    this._updateState('connecting');
    this.ws = new ReconnectingWebSocket(this.url);

    this.ws.onconnecting = () => {
      this._updateState('connecting');
    };

    this.ws.onopen = () => {
      this._updateState('connected');
      // a reconnection lands here too, which is what re-joins the channel
      // after a drop without anything else having to notice
      if (this.channel) {
        this.subscribe(this.channel);
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let data: ServerMessage;
      try {
        data = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        console.log('received invalid json from websocket');
        return;
      }

      switch (data.type) {
        case 'message':
          this.onMessage?.(data);
          break;
        case 'messagestatus':
          this.onMessageStatus?.(data);
          break;
        case 'typing':
          this.onTyping?.(data);
          break;
        case 'join':
          // The server broadcasts a join to the whole channel, so the same
          // frame is both "you are in" and "someone else came in". What tells
          // them apart is that we are still waiting: a join for the channel we
          // are subscribing to completes the subscription.
          if (this._state === 'connecting' && data.channel === this.channel) {
            this._updateState('connected');
            this.onSubscriptionSuccess?.(data);
          } else {
            this.onMemberAdded?.(data);
          }
          break;
        case 'joinerror':
          this.onSubscriptionError?.(data);
          break;
        case 'leave':
          this.onMemberRemoved?.(data);
          break;
        default:
          console.warn('Unknown message type:', (data as { type: string }).type);
      }
    };

    this.ws.onerror = () => {
      this._updateState('unavailable');
    };

    this.ws.onclose = () => {
      this._updateState('disconnected');
    };
  }

  /** Closes the connection for good: it will not come back. */
  close() {
    this.ws?.close();
  }

  /** Drops the connection and lets it reconnect, re-joining the channel. */
  refresh() {
    this.ws?.refresh();
  }

  /**
   * Joins a channel, leaving the current one.
   *
   * The channel is recorded and the state goes back to `connecting` whether or
   * not the command could be sent — either we are waiting for the join to be
   * acknowledged, or we are waiting for a connection to send it over, and both
   * are the same wait to whoever is watching. The react version bailed out
   * before both when the socket was down, which left `this.channel` on the old
   * channel: switching channel while reconnecting put the new name in the
   * header and then rejoined the old one on reconnect.
   */
  subscribe(channel: string) {
    this.channel = channel;
    this._updateState('connecting');
    this._send({ type: 'join', body: { name: channel } });
  }

  /** Leaves the current channel, staying connected. */
  unsubscribe() {
    this.channel = '';
    this._send({ type: 'join', body: { name: '' } });
  }

  /** Broadcasts a morse message to the channel. */
  sendMessage(body: MorseMessageBody) {
    this._send({ type: 'message', body });
  }

  /** Tells the channel whether we are keying something. */
  sendTyping(typing: boolean) {
    this._send({ type: 'typing', body: { typing } });
  }

  /**
   * Sends a command, if there is a connection to send it over.
   *
   * A command that cannot be sent is dropped with a log, as in the react
   * version: everything here is either a state announcement that the next one
   * supersedes, or a join that reconnecting repeats by itself.
   */
  private _send(command: Command) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error(`WebSocket is not open. Cannot send ${command.type}.`);
      return;
    }
    this.ws.send(JSON.stringify(command));
  }

  private _updateState(newState: SocketState) {
    if (this._state !== newState) {
      this._state = newState;
      this.onStateChange?.(this._state);
    }
  }
}
