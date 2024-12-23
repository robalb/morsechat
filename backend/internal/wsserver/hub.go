package wsserver

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
	"github.com/robalb/morsechat/internal/auth"
)

type ClientRequest struct{
  bytes []byte
  client *Client
}

type ClientRequestCommand struct{
  Type string `json:"type"`
  Body json.RawMessage `json:"body"`
}

type CommandJoinRoom struct{
  Name string `json:"name"`
}
type CommandTying struct{
  Typing bool `json:"typing"`
}
type CommandMorse struct{
  Dialect string `json:"dialect"`
  Wpm int `json:"wpm"`
  Message []int `json:"message"`
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

  //the channel the user is connected to
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

func New() *Hub {
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
  //TODO: remove
  logger.Printf("WsclientWsRequestMux: message: %v", message.bytes)

	var cmd ClientRequestCommand
	if err := json.Unmarshal(message.bytes, &cmd); err != nil {
    logger.Printf("WsClientRequestMux: Failed to parse json: %v\n", err)
		return
	}

  switch cmd.Type{
  case "join":
    handleJoinCommand(
      cmd.Body,
      message.client,
      ctx,
      logger,
      dbReadPool,
      dbWritePool,
      )
  case "typing":
    handleTypingCommand(
      cmd.Body,
      message.client,
      ctx,
      logger,
      dbReadPool,
      dbWritePool,
      )
  case "message":
    handleMorseCommand(
      cmd.Body,
      message.client,
      ctx,
      logger,
      dbReadPool,
      dbWritePool,
      )
  default:
    logger.Printf(
      "WsclientWsRequestMux: client %v: unknown cmd type: %s. message: %v",
      message.client.userInfo.Callsign,
      cmd.Type,
      message.bytes,
      )
  }

  //TODO: remove
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

//------------------------
//  ws command handlers
//------------------------

func handleJoinCommand(
  rawCmd json.RawMessage,
  client *Client,
  ctx context.Context,
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
  var cmd CommandJoinRoom
  if err := json.Unmarshal(rawCmd, &cmd); err != nil {
    logger.Printf("HandleJoinCommand: Failed to parse json: %v\n", err)
    return
  }
  logger.Printf("join: %v", cmd.Name)
}
func handleTypingCommand(
  rawCmd json.RawMessage,
  client *Client,
  ctx context.Context,
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
  var cmd CommandTying
  if err := json.Unmarshal(rawCmd, &cmd); err != nil {
    logger.Printf("HandleTypingCommand: Failed to parse json: %v\n", err)
    return
  }
}


func handleMorseCommand(
  rawCmd json.RawMessage,
  client *Client,
  ctx context.Context,
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
  var cmd CommandMorse
  if err := json.Unmarshal(rawCmd, &cmd); err != nil {
    logger.Printf("HandleMorseCommand: Failed to parse json: %v\n", err)
    return
  }
}

