package wsserver

import (
	"bytes"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/robalb/morsechat/internal/auth"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/validation"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 4096
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// We don't need this check: It's not particularly
		// clear what security issue it's supposed to solve
		// since Origin headers can easily be forged,
		// and browser requests that cannot forge Origin headers
		// are already limited by the browser CORS system
		return true
	},
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				// log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		clientRequest := ClientRequest{
			bytes:  message,
			client: c,
		}
		c.hub.broadcast <- clientRequest
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			//this iptimization will cause multiple messages to be sent
			//in the same packet. This is not good if the client expects
			//a single json message per packet.
			// Add queued chat messages to the current websocket message.
			// n := len(c.send)
			// for i := 0; i < n; i++ {
			// 	w.Write(newline)
			// 	w.Write(<-c.send)
			// }

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// This is a special webserver Route handler that upgrades
// user connections to a websocket.
func ServeWsInit(
	logger *log.Logger,
	hub *Hub,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		device, err := deviceid.New(r)
		if err != nil {
			validation.RespondError(w, "internal error", "", http.StatusInternalServerError)
			logger.Printf("ServeWsInit: deviceID error: %v", err.Error())
			return
		}

		//retrieve the user data, which can be either anonymous or connected
		//This is the only handler that accepts session jwts with anonymous data
		jwtData, err := auth.GetJwtData(r.Context())
		if err != nil {
			validation.RespondError(w, "ServeWsInit: invalid jwtData: "+err.Error(), "", http.StatusBadRequest)
			return
		}
		logger.Printf("ServeWsInit: (%v) Connecting user with data: %v ", device.Id, jwtData)

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		client := &Client{
			hub:                  hub,
			conn:                 conn,
			send:                 make(chan []byte, 256),
			userInfo:             jwtData,
			deviceInfo:           &device,
			channel:              "",
			isTyping:             false,
			lastMessageTimestamp: time.Now().Add(-config_ratelimitSeconds), //no ratelimit on the first message
		}
		client.hub.register <- client

		// Allow collection of memory referenced by the caller by doing all work in
		// new goroutines.
		go client.writePump()
		go client.readPump()
	}
}
