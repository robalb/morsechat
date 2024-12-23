package wsserver

import (
	"context"
	"database/sql"
	"log"

	"github.com/gorilla/websocket"
	"github.com/robalb/morsechat/internal/auth"
)

type ClientRequest struct{
  bytes []byte
  client *Client
}

type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
  // what you write here will be read by the
  // writepump, and forwarded to the websocket client
	send chan []byte

  // User info
  userInfo auth.JwtData

  //the channel the uesr is connected to
  channel string
}

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan ClientRequest

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan ClientRequest),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run(
  ctx context.Context,
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
      clientRequestMux(
        &message,
        ctx,
        logger,
        h,
        dbReadPool,
        dbWritePool,
      )
		}
	}
}

func clientRequestMux(
  message *ClientRequest,
  ctx context.Context,
	logger *log.Logger,
	h *Hub,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
  logger.Printf("clientWsRequestMux: message: %v", message.bytes)
  //broadcast action
  for client := range h.clients {
    select {
    case client.send <- message.bytes:
    default:
      close(client.send)
      delete(h.clients, client)
    }
  }
}
