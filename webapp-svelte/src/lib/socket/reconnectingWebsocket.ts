/**
 * Port of webapp/src/socket/reconnectingwebsocket.js, which is itself a vendored
 * copy of https://github.com/joewalnes/reconnecting-websocket (MIT, Joe Walnes).
 *
 * Behaves like a WebSocket, except that a connection that fails or drops is
 * retried, with an exponentially backing off delay, until it comes back.
 *
 *   onconnecting → onopen → onmessage… → onclose (lost) → onconnecting → onopen…
 *
 * Two things changed in the port, neither of them behavioural:
 *
 * - the original dispatches its events through a detached `<div>` used as an
 *   EventTarget, which was how one raised custom events in IE9. The handlers
 *   are called directly here.
 * - it is a class with typed fields, instead of a constructor function
 *   assigning onto `this`.
 *
 * Everything else — the 2s connection timeout, the backoff, the fact that
 * `onclose` fires once per disconnection rather than once per failed retry — is
 * kept exactly as it was, because the connection state machine of
 * socket/client.ts is written against it.
 */

export interface ReconnectingWebSocketOptions {
  /** log every state transition to the console */
  debug?: boolean;
  /** connect on construction, rather than waiting for a call to open() */
  automaticOpen?: boolean;
  /** ms to wait before the first reconnection attempt */
  reconnectInterval?: number;
  /** ceiling for the backing off reconnection delay */
  maxReconnectInterval?: number;
  /** the delay is multiplied by this after every failed attempt */
  reconnectDecay?: number;
  /** a connection that has not opened within this is closed and retried */
  timeoutInterval?: number;
  /** give up after this many attempts. null: never give up */
  maxReconnectAttempts?: number | null;
  binaryType?: BinaryType;
}

/** what `onconnecting` is called with after a drop: why the socket closed */
export interface ConnectingEvent {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

const defaults: Required<ReconnectingWebSocketOptions> = {
  debug: false,
  automaticOpen: true,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectDecay: 1.5,
  timeoutInterval: 2000,
  maxReconnectAttempts: null,
  binaryType: 'blob',
};

export class ReconnectingWebSocket {
  debug: boolean;
  automaticOpen: boolean;
  reconnectInterval: number;
  maxReconnectInterval: number;
  reconnectDecay: number;
  timeoutInterval: number;
  maxReconnectAttempts: number | null;
  binaryType: BinaryType;

  /** the url as given to the constructor. Read only. */
  readonly url: string;
  /** attempts since the last successful connection. Read only. */
  reconnectAttempts = 0;
  /** one of the WebSocket.CONNECTING / OPEN / CLOSING / CLOSED. Read only. */
  readyState: number = WebSocket.CONNECTING;
  /** the sub-protocol the server selected, once there is a connection */
  protocol: string | null = null;

  /** log every instance's transitions, whatever their own `debug` says */
  static debugAll = false;

  // Handlers. Assigned by the owner; no-ops until then.
  onopen: (event: Event & { isReconnect?: boolean }) => void = () => {};
  onclose: (event: Event) => void = () => {};
  onconnecting: (event: ConnectingEvent) => void = () => {};
  onmessage: (event: MessageEvent) => void = () => {};
  onerror: (event: Event) => void = () => {};

  private ws: WebSocket | null = null;
  private protocols: string | string[] | undefined;
  /** close() was called: this socket is done, and must not reconnect */
  private forcedClose = false;
  /** the current attempt was abandoned by the connection timeout */
  private timedOut = false;

  constructor(
    url: string,
    protocols?: string | string[],
    options: ReconnectingWebSocketOptions = {}
  ) {
    const settings = { ...defaults, ...options };
    this.debug = settings.debug;
    this.automaticOpen = settings.automaticOpen;
    this.reconnectInterval = settings.reconnectInterval;
    this.maxReconnectInterval = settings.maxReconnectInterval;
    this.reconnectDecay = settings.reconnectDecay;
    this.timeoutInterval = settings.timeoutInterval;
    this.maxReconnectAttempts = settings.maxReconnectAttempts;
    this.binaryType = settings.binaryType;

    this.url = url;
    this.protocols = protocols;

    if (this.automaticOpen) {
      this.open(false);
    }
  }

  private log(...args: unknown[]) {
    if (this.debug || ReconnectingWebSocket.debugAll) {
      console.debug('ReconnectingWebSocket', ...args);
    }
  }

  /**
   * Opens a connection.
   *
   * @param reconnectAttempt - false for the first connection, true for every
   * retry. It is what decides whether `onconnecting` is announced up front and
   * whether a failure counts as a disconnection.
   */
  open(reconnectAttempt: boolean) {
    if (reconnectAttempt) {
      if (
        this.maxReconnectAttempts &&
        this.reconnectAttempts > this.maxReconnectAttempts
      ) {
        return;
      }
    } else {
      this.onconnecting({});
      this.reconnectAttempts = 0;
    }

    this.log('attempt-connect', this.url);
    const ws = new WebSocket(this.url, this.protocols ?? []);
    ws.binaryType = this.binaryType;
    this.ws = ws;

    // a connection that hangs half open is worse than no connection: drop it
    // and let the reconnection path deal with it
    const timeout = setTimeout(() => {
      this.log('connection-timeout', this.url);
      this.timedOut = true;
      ws.close();
      this.timedOut = false;
    }, this.timeoutInterval);

    ws.onopen = () => {
      clearTimeout(timeout);
      this.log('onopen', this.url);
      this.protocol = ws.protocol;
      this.readyState = WebSocket.OPEN;
      this.reconnectAttempts = 0;
      const e = new Event('open') as Event & { isReconnect?: boolean };
      e.isReconnect = reconnectAttempt;
      this.onopen(e);
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      this.ws = null;
      if (this.forcedClose) {
        this.readyState = WebSocket.CLOSED;
        this.onclose(new Event('close'));
        return;
      }

      this.readyState = WebSocket.CONNECTING;
      this.onconnecting({
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      // Only the first failure is a disconnection; the retries that follow are
      // already covered by the `connecting` above, and announcing each of them
      // as a close would have the owner reset its state on every backoff tick.
      if (!reconnectAttempt && !this.timedOut) {
        this.log('onclose', this.url);
        this.onclose(new Event('close'));
      }

      const delay =
        this.reconnectInterval *
        Math.pow(this.reconnectDecay, this.reconnectAttempts);
      setTimeout(
        () => {
          this.reconnectAttempts++;
          this.open(true);
        },
        Math.min(delay, this.maxReconnectInterval)
      );
    };

    ws.onmessage = (event) => {
      this.log('onmessage', this.url, event.data);
      this.onmessage(event);
    };

    ws.onerror = (event) => {
      this.log('onerror', this.url, event);
      this.onerror(event);
    };
  }

  /** Sends over the connection, if there is one. Throws when there is not. */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (!this.ws) {
      throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
    }
    this.log('send', this.url, data);
    return this.ws.send(data);
  }

  /** Closes for good: this socket will not reconnect. */
  close(code = 1000, reason?: string) {
    this.forcedClose = true;
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  /**
   * Drops the connection and lets it come back. For when the app has reason to
   * believe the connection is stale — a changed identity, a missed heartbeat.
   */
  refresh() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
