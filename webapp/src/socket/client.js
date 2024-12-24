import {wsUrl} from '../utils/apiResolver.js'
import {ReconnectingWebSocket} from './reconnectingwebsocket.js'

export class SocketClient {
  constructor(initialChannel) {
    this.url = wsUrl;
    this.ws = null;
    /**
    * states:
    *  -initialized
    *  -connecting: 
    *     in this state, the client is either trying to estabilish
    *     a websocket connection or trying to subscribe to a channel
    *  -connected
    *     This state is reached after a succesful websocket connection
    *     or after a succesful subscription to a channel
    *  -unavailable
    *  -disconnected
    */
    this._state = "initialized"; // Initial state
    this.channel = initialChannel

    // Callback placeholders
    this.onMessage = null;
    this.onTyping = null;
    this.onSubscriptionSuccess = null;
    this.onSubscriptionError = null;
    this.onMemberAdded = null;
    this.onMemberRemoved = null;
    this.onStateChange = null;
    this.connect();
  }

  // Method to initialize and open the WebSocket connection
  connect() {
    if (this.ws) {
      console.warn("WebSocket is already connected.");
      return;
    }

    this._updateState("connecting");
    this.ws = new ReconnectingWebSocket(this.url);

    this.ws.onconnecting = () => {
      this._updateState("connecting");
    };
    // Handle WebSocket open
    this.ws.onopen = () => {
      this._updateState("connected");
      if(this.channel){
        this.subscribe(this.channel)
      }
    };

    // Handle incoming messages
    this.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.log("received invalid json from websocket");
        return;
      }

      switch (data.type) {
        case 'message':
          if (this.onMessage) this.onMessage(data);
          break;
        case 'typing':
          if (this.onTyping) this.onTyping(data);
          break;
        case 'join':
          if (this._state == "connecting" && data.channel == this.channel){
            this._updateState("connected");
            if (this.onSubscriptionSuccess) this.onSubscriptionSuccess(data);
          }else{
            if (this.onMemberAdded) this.onMemberAdded(data);
          }
          break;

        case 'joinerror':
          if (this.onSubscriptionError) this.onSubscriptionError(data);
          break;
        case 'leave':
          if (this.onMemberRemoved) this.onMemberRemoved(data);
          break;
        default:
          console.warn("Unknown message type:", data.type);
      }
    };

    // Handle WebSocket errors
    this.ws.onerror = (error) => {
      this._updateState("unavailable");
    };

    // Handle WebSocket closure
    this.ws.onclose = () => {
      this._updateState("disconnected");
      // this.ws = null; // Reset WebSocket instance
    };
  }

  //close the websocket forever
  close(){
    this.ws.close()
  }
  //refresh the websocket 
  refresh(){
    this.ws.refresh()
  }



  // Subscribe to a channel or resource
  subscribe(channel) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. Cannot subscribe.");
      return;
    }
    this.channel = channel
    this._updateState("connecting");

    const message = {
      type: 'join',
      body: {
        name: channel
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  // Unsubscribe to a channel or resource
  unsubscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. Cannot subscribe.");
      return;
    }
    this.channel = ""
    const message = {
      type: 'join',
      body: {
        name: ""
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  // Send a morse message
  sendMessage(messageContent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. Cannot send message.");
      return;
    }

    const message = {
      type: 'message',
      body: {
        messageContent
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  // Send typing indicator
  sendTyping(status) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. Cannot send typing notification.");
      return;
    }

    const message = {
      type: 'typing',
      body: {
        typing: status
      }
    };
    this.ws.send(JSON.stringify(message));
  }

  // Send a raw message
  sendRawMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. Cannot send message.");
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  _updateState(newState) {
    console.log("socket client.js: updateState: ", newState)
    if (this._state !== newState) {
      this._state = newState;
      if (this.onStateChange) this.onStateChange(this._state);
    }
  }

  /**
  * Setter for state changes callback
  *  parameters:
  *   callback: Function(state string)
  */
  set stateChange(callback) {
    this.onStateChange = callback;
  }

  /**
  * Setter for morse messages callback
  *  parameters:
  *   callback: Function(message Object{
  *      callsign string,
  *      wpm integer,
  *      dialect string,
  *      message []integer
  *    })
  */
  set message(callback) {
    this.onMessage = callback;
  }


  /**
  * Setter for "user is typing" event callback
  *  parameters:
  *   callback: Function(message Object{
  *      callsign string,
  *      typing boolean,
  *    })
  */
  set typing(callback) {
    this.onTyping = callback;
  }

  /**
  * Setter for "member added" event callback
  *  parameters:
  *   callback: Function(message Object{
  *      channel string
  *      users []{
  *         is_anonymous bool
  *         callsign string
  *         username string
  *         is_typing bool
  *      }
  *      newuser {
  *         is_anonymous bool
  *         callsign string
  *         username string
  *         is_typing bool
  *      }
  *    })
  */
  set memberAdded(callback) {
    this.onMemberAdded = callback;
  }

  /**
  * Setter for "member removed" event callback
  *  parameters:
  *   callback: Function(message Object{
  *      channel string
  *      users []{
  *         is_anonymous bool
  *         callsign string
  *         username string
  *         is_typing bool
  *      }
  *      left {
  *         is_anonymous bool
  *         callsign string
  *         username string
  *         is_typing bool
  *      }
  *    })
  */
  set memberRemoved(callback) {
    this.onMemberRemoved = callback;
  }

  /**
  * Setter for subscription success callback
  *  parameters:
  *   callback: Function(message Object{
  *      channel string
  *      users []{
  *         is_anonymous bool
  *         callsign string
  *         username string
  *         is_typing bool
  *      }
  *      newuser {
  *         is_anonymous bool
  *         callsign string
  *         username string
  *         is_typing bool
  *      }
  *    })
  */
  set subscriptionSuccess(callback) {
    this.onSubscriptionSuccess = callback;
  }

  /**
  * Setter for subscription error callback
  *  parameters:
  *   callback: Function(message Object{
  *      rejected_channel string
  *      error string
  *    })
  */
  set subscriptionError(callback) {
    this.onSubscriptionError = callback;
  }

  // Getter for the current state
  get state() {
    return this._state;
  }
}
