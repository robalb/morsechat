package wsserver

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/config"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/monitoring"
)

var (
	// A list of available channels.
	// Edit to add new channels, all data will automatically propagate
	// names containing "pro" are for logged users only
	config_channels = map[string]bool{
		"presence-training": true,
		"presence-ch1":      true,
		"presence-ch2":      true,
		"presence-ch3":      true,
		"presence-ch4":      true,
		"presence-ch5":      true,
		"presence-ch6":      true,
		"presence-pro-1":    true,
		"presence-pro-2":    true,
		"presence-pro-3":    true,
	}
	config_wpmMin               = 5
	config_wpmMax               = 50
	config_maxChannelOnline     = 100 // max total devices that can join a channel
	config_maxChannelOnlineIpv4 = 5   // max devices that can join a channel, with the same ipv4
	config_ratelimitSeconds     = 10 * time.Second
)

type SystemRequest interface {
	isSystemMessage()
}

type ClientRequest struct {
	bytes  []byte
	client *Client
}
type ClientRequestCommand struct {
	Type string          `json:"type"`
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

	//deviceID audit info
	deviceInfo *deviceid.DeviceData

	// the channel the user is connected to
	channel string

	isTyping bool

	// the last time the user sent a message
	lastMessageTimestamp time.Time
}

// Hub maintains the set of active clients and broadcasts messages to the clients.
// every read or write operation to this hub happens via message channels
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	clientRequest chan ClientRequest

  // Inbound messages from other parts of the system.
  SystemRequest chan SystemRequest

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func New() *Hub {
	return &Hub{
		clientRequest:  make(chan ClientRequest),
    SystemRequest: make(chan SystemRequest),
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
	metrics *monitoring.Metrics,
) {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				if client.channel != "" {
					BroadcastUserLeft(client.channel, client, logger)
				}
				delete(h.clients, client)
				close(client.send)
				updateOnlineUsersGauge(h, metrics)
			}
		case message := <-h.clientRequest:
			clientRequestMux(
				&message,
				ctx,
				logger,
				config,
				dbReadPool,
				dbWritePool,
				metrics,
			)
    case message := <-h.SystemRequest:
			systemRequestMux(
				&message,
				ctx,
        h,
				logger,
				config,
				dbReadPool,
				dbWritePool,
				metrics,
			)
		}
	}
}


// Broadcast a raw message to every connected user, in every channel
func (h *Hub) broadcastAll(message []byte, logger *log.Logger) {
	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			//TODO: investigate this part
			close(client.send)
			delete(h.clients, client)
			logger.Println("BroadCastAll: forced connection drop")
		}
	}
}

// Broadcast a raw message to every user connected to the given channel
func (h *Hub) broadcastChannel(message []byte, channel string, logger *log.Logger) {
	for client := range h.clients {
		if client.channel == channel {
			select {
			case client.send <- message:
			default:
				//TODO: investigate this part
				close(client.send)
				delete(h.clients, client)
				logger.Println("broadcastChannel: forced connection drop")
			}
		}
	}
}

// Broadcast a raw message to users that have the given channel and device clusterID
func (h *Hub) broadcastChannelCluster(message []byte, channel string, cluster string, logger *log.Logger) {
	for client := range h.clients {
		if client.channel == channel && client.deviceInfo.ClusterId == cluster {
			select {
			case client.send <- message:
			default:
				//TODO: investigate this part
				close(client.send)
				delete(h.clients, client)
				logger.Println("broadcastChannelCluster: forced connection drop")
			}
		}
	}
}

// send a "join error" message to a specific user
func messageUserJoinError(client *Client, logger *log.Logger, error string, channel string) {
	msg := MessageJoinError{
		Type:            "joinerror",
		RejectedChannel: channel,
		Error:           error,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		logger.Printf("MessageUserJoinError: msg json marshal error: %v", err.Error())
	}
	messageUser(client, msgBytes, logger)
}

// send a "morse message broadcast error" to a specific user
func messageUserMorseStatusError(client *Client, logger *log.Logger, error string, details string) {
	msg := MessageMorseStatus{
		Type:    "messagestatus",
		Ok:      false,
		Error:   error,
		Details: details,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		logger.Printf("HandleMorseCommand: msg json marshal error: %v", err.Error())
	}
	messageUser(client, msgBytes, logger)
}

// send message bytes to a specific user
func messageUser(client *Client, message []byte, logger *log.Logger) {
	select {
	case client.send <- message:
	default:
		//TODO: investigate this part
		close(client.send)
		delete(client.hub.clients, client)
		logger.Println("messageUser: forced connection drop")
	}
}

// Broadcast a  message to every user connected to the given channel,
// notifying that the given user has left the channel
// note: This function will not remove the given user
func BroadcastUserLeft(channel string, client *Client, logger *log.Logger) {
	//there can be multiple instances of a logged user account connected to a channel.
	//in that cause if one instance leaves, the user did not actually leave so
	//we will not broadcast the message
	for c := range client.hub.clients {
		if c.userInfo.Callsign == client.userInfo.Callsign && c != client {
			return
		}
	}

	msg := MessageLeave{
		Type:    "leave",
		Channel: channel,
		Users:   []WsUser{},
		Left: WsUser{
			IsAnonymous: client.userInfo.IsAnonymous,
			Callsign:    client.userInfo.Callsign,
			Username:    client.userInfo.Username,
			IsTyping:    client.isTyping,
		},
	}
	for c := range client.hub.clients {
		if c.channel != channel {
			continue
		}
		if c == client || c.userInfo.Callsign == client.userInfo.Callsign {
			continue
		}
		userInfo := c.userInfo
		msg.Users = append(msg.Users, WsUser{
			IsAnonymous: userInfo.IsAnonymous,
			Callsign:    userInfo.Callsign,
			Username:    userInfo.Username,
			IsTyping:    client.isTyping,
		})
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		logger.Printf("BroadcastUserLeft: msg json marshal error: %v", err.Error())
	}
	client.hub.broadcastChannel(msgBytes, channel, logger)
}

func updateOnlineUsersGauge(
	hub *Hub,
	metrics *monitoring.Metrics,
) {
	channelCount := make(map[string]int)
	for existingChannel := range config_channels {
		channelCount[existingChannel] = 0
	}

	for c := range hub.clients {
		channelCount[c.channel]++
	}

	for channel, count := range channelCount {
		metrics.ConnectedUsers.
			With(prometheus.Labels{"channel": channel}).
			Set(float64(count))
	}
}
