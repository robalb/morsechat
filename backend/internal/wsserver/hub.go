package wsserver

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/config"
	"github.com/robalb/morsechat/internal/morse"
)

type ClientRequest struct{
  bytes []byte
  client *Client
}
type ClientRequestCommand struct{
  Type string `json:"type"`
  Body json.RawMessage `json:"body"`
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

  isTyping bool

  //the last time the user sent a message
  lastMessageTimestamp time.Time
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
	config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
        if client.channel != ""{
          BroadcastUserLeft(client.channel, client, logger)
        }
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
      clientRequestMux(
        &message,
        ctx,
        logger,
        config,
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
	config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
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
      logger,
      )
  case "typing":
    handleTypingCommand(
      cmd.Body,
      message.client,
      logger,
      )
  case "message":
    handleMorseCommand(
      cmd.Body,
      message.client,
      ctx,
      logger,
      config,
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

}

// Broadcast a raw message to every connected user, in every channel
func (h *Hub) BroadcastAll(message []byte){
  for client := range h.clients {
    select {
    case client.send <- message:
    default:
      //TODO: investigate this part
      close(client.send)
      delete(h.clients, client)
    }
  }
}

// Broadcast a raw message to every user connected to the given channel
func (h *Hub) BroadcastChannel(message []byte, channel string){
  for client := range h.clients {
    if client.channel == channel {
      select {
      case client.send <- message:
      default:
        //TODO: investigate this part
        close(client.send)
        delete(h.clients, client)
      }
    }
  }

}

//send a "join error" message to a specific user
func MessageUserJoinerror(client *Client, logger *log.Logger, error string, channel string){
  msg := MessageJoinError{
    Type: "joinerror",
    RejectedChannel: channel,
    Error: error,
  }
  msgBytes, err := json.Marshal(msg)
  if err != nil{
    logger.Printf("MessageUserJoinError: msg json marshal error: %v", err.Error())
  }
  MessageUser(client, msgBytes)
}

//send a "morse message broadcast error" to a specific user
func MessageUserMorseStatusError(client *Client, logger *log.Logger, error string, details string){
  msg := MessageMorseStatus{
    Type: "messagestatus",
    Ok: false,
    Error: error,
    Details: details,
  }
  msgBytes, err := json.Marshal(msg)
  if err != nil{
    logger.Printf("HandleMorseCommand: msg json marshal error: %v", err.Error())
  }
  MessageUser(client, msgBytes)
}


//send message bytes to a specific user
func MessageUser(client *Client, message []byte){
  select {
  case client.send <- message:
  default:
    //TODO: investigate this part
    close(client.send)
    delete(client.hub.clients, client)
  }
}

// Broadcast a  message to every user connected to the given channel,
// notifying that the given user has left the channel
// note: This function will not remove the given user
func BroadcastUserLeft(channel string, client *Client, logger *log.Logger){
  //there can be multiple instances of a logged user account connected to a channel.
  //in that cause if one instance leaves, the user did not actually leave so
  //we will not broadcast the message
  for c := range client.hub.clients {
    if c.userInfo.Callsign == client.userInfo.Callsign && c != client{
      return
    }
  }

  msg := MessageLeave{
    Type: "leave",
    Channel: channel,
    Users: []WsUser{},
    Left: WsUser{
      IsAnonymous: client.userInfo.IsAnonymous,
      Callsign: client.userInfo.Callsign,
      Username: client.userInfo.Username,
      IsTyping: client.isTyping,
    },
  }
  for c := range client.hub.clients {
    if c.channel != channel{
      continue
    }
    if c == client || c.userInfo.Callsign == client.userInfo.Callsign{
      continue
    }
    userInfo := c.userInfo
    msg.Users = append(msg.Users, WsUser{
      IsAnonymous: userInfo.IsAnonymous,
      Callsign:    userInfo.Callsign,
      Username:    userInfo.Username,
      IsTyping: client.isTyping,
    })
  }
  msgBytes, err := json.Marshal(msg)
  if err != nil{
    logger.Printf("BroadcastUserLeft: msg json marshal error: %v", err.Error())
  }
  client.hub.BroadcastChannel(msgBytes, channel)
}

//------------------------
//  ws command handlers
//------------------------

func handleJoinCommand(
  rawCmd json.RawMessage,
  client *Client,
	logger *log.Logger,
){
  var cmd CommandJoinRoom
  if err := json.Unmarshal(rawCmd, &cmd); err != nil {
    logger.Printf("HandleJoinCommand: Failed to parse json: %v\n", err)
    return
  }
  channels := map[string]bool{
      "presence-training": true,
      "presence-ch1": true,
      "presence-ch2": true,
      "presence-ch3": true,
      "presence-ch4": true,
      "presence-ch5": true,
      "presence-ch6": true,
      "presence-pro-1": true,
      "presence-pro-2": true,
      "presence-pro-3": true,
  }
  if _, ok := channels[cmd.Name]; !ok {
    logger.Printf("HandleJoinCommand: invalid channel name: %v", cmd.Name)
    MessageUserJoinerror(client, logger, "invalid channel name", cmd.Name)
    return
  }

  if strings.Contains(cmd.Name, "pro") && client.userInfo.IsAnonymous{
    MessageUserJoinerror(client, logger, "invalid_credentials", cmd.Name)
    return
  }

  //TODO: prometheus gauge of online users for every room

  //TODO: is this thread safe?
  oldChannel := client.channel
  client.channel = cmd.Name

  // If the user is leaving a channel:
  // notify the old channel that they left
  if oldChannel != "" && oldChannel != cmd.Name{
    BroadcastUserLeft(oldChannel, client, logger)
  }
  // BroadcastUserJoined:
  // Notify the new channel that a new user just joined
  msg := MessageJoin{
    Type: "join",
    Channel: client.channel,
    Users: []WsUser{},
    Newuser: WsUser{
      IsAnonymous: client.userInfo.IsAnonymous,
      Callsign: client.userInfo.Callsign,
      Username: client.userInfo.Username,
      IsTyping: client.isTyping,
    },
  }
  for c := range client.hub.clients {
    if c.channel != cmd.Name{
      continue
    }
    userInfo := c.userInfo
    msg.Users = append(msg.Users, WsUser{
      IsAnonymous: userInfo.IsAnonymous,
      Callsign:    userInfo.Callsign,
      Username:    userInfo.Username,
      IsTyping: client.isTyping,
    })
  }
  msgBytes, err := json.Marshal(msg)
  if err != nil{
    logger.Printf("HandleJoinCommand: msg json marshal error: %v", err.Error())
  }
  client.hub.BroadcastChannel(msgBytes, client.channel)
}

func handleTypingCommand(
  rawCmd json.RawMessage,
  client *Client,
	logger *log.Logger,
){
  var cmd CommandTying
  if err := json.Unmarshal(rawCmd, &cmd); err != nil {
    logger.Printf("HandleTypingCommand: Failed to parse json: %v\n", err)
    return
  }
  client.isTyping = cmd.Typing
  if client.channel != "" {
    msg := MessageTyping{
      Type: "typing",
      Typing: cmd.Typing,
      Callsign: client.userInfo.Callsign,
    }
    msgBytes, err := json.Marshal(msg)
    if err != nil{
      logger.Printf("HandleTypingCommand: msg json marshal error: %v", err.Error())
    }
    client.hub.BroadcastChannel(msgBytes, client.channel)
  }
}


func handleMorseCommand(
  rawCmd json.RawMessage,
  client *Client,
  ctx context.Context,
	logger *log.Logger,
	config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
){
  var cmd CommandMorse
  if err := json.Unmarshal(rawCmd, &cmd); err != nil {
    logger.Printf("HandleMorseCommand: Failed to parse json: %v\n", err)
    return
  }
	messageText, messageDuration, isMalformed := morse.Translate(cmd.Message, cmd.Wpm)
  if isMalformed {
    //TODO; metrics
    logger.Printf("HandleMorseCommand: malformed message:\n")
    MessageUserMorseStatusError(client, logger, "Malformed message", "")
    return
  }
  isBadLanguage := morse.ContainsBadLanguage(messageText)
  if isBadLanguage{
    //TODO; metrics
    logger.Printf("HandleMorseCommand: bad language: %v\n", messageText)
  }

  //ratelimiting logic
  //minimum seconds between each message sent, which double
  //if the user is suspiciously fast
  cooldownTime := 10 * time.Second
  if cmd.Wpm > 30 {
    cooldownTime += cooldownTime
  }
  lastTime := client.lastMessageTimestamp
  if !lastTime.IsZero(){
    delta := time.Now().Sub(lastTime)
    // logger.Printf("DEBUG time delta: %v messageDuration: %v", delta, time.Duration(messageDuration)*time.Millisecond)
    if delta < cooldownTime || delta < time.Duration(messageDuration)*time.Millisecond{
      //TODO: metrics
      MessageUserMorseStatusError(client, logger, "You are sending too many messages, please wait some seconds", "")
      return
    }
  }
  client.lastMessageTimestamp = time.Now()

  signatureData := morse.SignedMessage{
    Session: "TODOuuidv4", //This is the critical element we need to ban an user
    PlainText: messageText,
    Username: client.userInfo.Username,
    Callsign: client.userInfo.Callsign,
    Timestamp: time.Now().Unix(),
  }
  signature, err := morse.EncryptMessage(signatureData, config.SecretBytes)

  msg := MessageMorse{
    Type: "message",
    Callsign: client.userInfo.Callsign,
    Dialect: cmd.Dialect,
    Wpm: cmd.Wpm,
    Message: cmd.Message,
    Signature: signature,
  }
  msgBytes, err := json.Marshal(msg)
  if err != nil{
    logger.Printf("HandleMorseCommand: msg json marshal error: %v", err.Error())
  }

  if isBadLanguage{
    MessageUser(client, msgBytes)
  } else{
    client.hub.BroadcastChannel(msgBytes, client.channel)
  }
  // //notify the user that the message was sent
  {
    msg := MessageMorseStatus{
      Type: "messagestatus",
      Ok: true,
    }
    msgBytes, err := json.Marshal(msg)
    if err != nil{
      logger.Printf("HandleMorseCommand: msg json marshal error: %v", err.Error())
    }
    MessageUser(client, msgBytes)
  }
}

