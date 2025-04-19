// Api request handlers for the websocket client API
package wsserver

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/robalb/morsechat/internal/config"
	"github.com/robalb/morsechat/internal/monitoring"
	"github.com/robalb/morsechat/internal/morse"
)

func clientRequestMux(
	message *ClientRequest,
	ctx context.Context,
	logger *log.Logger,
	config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
	metrics *monitoring.Metrics,
) {
	var cmd ClientRequestCommand
	if err := json.Unmarshal(message.bytes, &cmd); err != nil {
		logger.Printf("WsClientRequestMux: Failed to parse json: %v\n", err)
		return
	}

	switch cmd.Type {
	case "join":
		handleJoinCommand(
			cmd.Body,
			message.client,
			logger,
			metrics,
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
			metrics,
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


func handleJoinCommand(
	rawCmd json.RawMessage,
	client *Client,
	logger *log.Logger,
	metrics *monitoring.Metrics,
) {
	var cmd CommandJoinRoom
	if err := json.Unmarshal(rawCmd, &cmd); err != nil {
		logger.Printf("HandleJoinCommand: Failed to parse json: %v\n", err)
		return
	}
	if _, ok := config_channels[cmd.Name]; !ok {
		logger.Printf("HandleJoinCommand: invalid channel name: %v", cmd.Name)
		messageUserJoinError(client, logger, "invalid channel name", cmd.Name)
		return
	}

	if strings.Contains(cmd.Name, "pro") && client.userInfo.IsAnonymous {
		messageUserJoinError(client, logger, "invalid_credentials", cmd.Name)
		return
	}

	//check channel capacity
	online := 0
	onlineWithSameIP := 0
	for c := range client.hub.clients {
		if c.channel == cmd.Name {
			online += 1
		}
		if c.deviceInfo.Ipv4 == client.deviceInfo.Ipv4 {
			onlineWithSameIP += 1
		}
	}
	if online > config_maxChannelOnline {
		messageUserJoinError(client, logger, "too_many_users", cmd.Name)
		logger.Printf("HandleJoinCommand: (%s) denied, too many users", client.deviceInfo.Id)
		metrics.ConnectionDenied.
			With(prometheus.Labels{"reason": "max_capacity"}).
			Add(1)
		return
	}
	if onlineWithSameIP > config_maxChannelOnlineIpv4 {
		messageUserJoinError(client, logger, "too_many_users", cmd.Name)
		logger.Printf("HandleJoinCommand: (%s) denied, too many similar ips", client.deviceInfo.Id)
		metrics.ConnectionDenied.
			With(prometheus.Labels{"reason": "max_ip"}).
			Add(1)
		return
	}

	//refresh deviceid info
	//TODO: this is temporary, in the future this function will be slow and async,
	//      this will be called regularly for each user in the hub,
	//      and synced via channels.
	//      if a bad user gets detected, the future system will just drop the connection
	// client.deviceInfo.Refresh()

	if client.deviceInfo.IsBad {
		messageUserJoinError(client, logger, "too_many_users", cmd.Name)
		logger.Printf("HandleJoinCommand: (%s) denied, device is bad", client.deviceInfo.Id)
		metrics.ConnectionDenied.
			With(prometheus.Labels{"reason": "bad"}).
			Add(1)
		return
	}

	// If the user is leaving a channel
	// notify the old channel that they left
	oldChannel := client.channel
	client.channel = cmd.Name
	if oldChannel != "" && oldChannel != cmd.Name {
		BroadcastUserLeft(oldChannel, client, logger)
	}

	// BroadcastUserJoined:
	// Notify the new channel that a new user just joined
	msg := MessageJoin{
		Type:    "join",
		Channel: client.channel,
		Users:   []WsUser{},
		Newuser: WsUser{
			IsAnonymous: client.userInfo.IsAnonymous,
			Callsign:    client.userInfo.Callsign,
			Username:    client.userInfo.Username,
			IsTyping:    client.isTyping,
		},
	}
	for c := range client.hub.clients {
		if c.channel != cmd.Name {
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
	updateOnlineUsersGauge(client.hub, metrics)

	msgBytes, err := json.Marshal(msg)
	if err != nil {
		logger.Printf("HandleJoinCommand: msg json marshal error: %v", err.Error())
    return
	}
	client.hub.broadcastChannel(msgBytes, client.channel, logger)
}

func handleTypingCommand(
	rawCmd json.RawMessage,
	client *Client,
	logger *log.Logger,
) {
	var cmd CommandTying
	if err := json.Unmarshal(rawCmd, &cmd); err != nil {
		logger.Printf("HandleTypingCommand: Failed to parse json: %v\n", err)
		return
	}
	client.isTyping = cmd.Typing
	if client.channel != "" {
		msg := MessageTyping{
			Type:     "typing",
			Typing:   cmd.Typing,
			Callsign: client.userInfo.Callsign,
		}
		msgBytes, err := json.Marshal(msg)
		if err != nil {
			logger.Printf("HandleTypingCommand: msg json marshal error: %v", err.Error())
      return
		}
		client.hub.broadcastChannel(msgBytes, client.channel, logger)
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
	metrics *monitoring.Metrics,
) {
	var cmd CommandMorse
	if err := json.Unmarshal(rawCmd, &cmd); err != nil {
		logger.Printf("HandleMorseCommand: Failed to parse json: %v\n", err)
		return
	}

	if cmd.Wpm < config_wpmMin || cmd.Wpm > config_wpmMax {
		logger.Printf("HandleMorseCommand: malformed cmd.wpm\n")
		messageUserMorseStatusError(client, logger, "Malformed message", "")
		return
	}

	//users can be connected without joining a channel.
	if client.channel == "" || client.channel == "presence-training" {
		messageUserMorseStatusError(client, logger, "Malformed message", "")
		return
	}

	messageText, messageDuration, isMalformed := morse.Translate(cmd.Message, cmd.Wpm)
	if isMalformed {
		logger.Printf("HandleMorseCommand: malformed cmd.message\n")
		messageUserMorseStatusError(client, logger, "Malformed message", "")
		return
	}

	//ratelimiting logic: Min seconds between each message sent,
	// which doubles if the user is suspiciously fast,
	cooldownTime := config_ratelimitSeconds
	if cmd.Wpm > 30 {
		cooldownTime += cooldownTime
	}
  if client.userInfo.IsAnonymous {
		cooldownTime += cooldownTime
  }
  if client.userInfo.IsVerified {
    cooldownTime = 0
  }
	lastTime := client.lastMessageTimestamp
	if !lastTime.IsZero() {
		delta := time.Now().Sub(lastTime)
		if delta < cooldownTime || delta < time.Duration(messageDuration)*time.Millisecond {
			messageUserMorseStatusError(client, logger, "You are sending too many messages, please wait some seconds", "")
      msg := MessageTyping{
        Type:     "typing",
        Typing:   false,
        Callsign: client.userInfo.Callsign,
      }
      msgBytes, err := json.Marshal(msg)
      if err != nil {
        logger.Printf("HandleTypingCommand: msg json marshal error: %v", err.Error())
        return
      }
      client.hub.broadcastChannel(msgBytes, client.channel, logger)
			return
		}
	}
	client.lastMessageTimestamp = time.Now()

	signatureData := morse.SignedMessage{
		Deviceid:  client.deviceInfo.Id,
		Userid:    client.userInfo.UserId,
		Username:  client.userInfo.Username,
		Callsign:  client.userInfo.Callsign,
		PlainText: messageText,
		Timestamp: time.Now().Unix(),
	}
	signature, err := morse.EncryptMessage(signatureData, config.SecretBytes)

	msg := MessageMorse{
		Type:      "message",
		Callsign:  client.userInfo.Callsign,
		Dialect:   cmd.Dialect,
		Wpm:       cmd.Wpm,
		Message:   cmd.Message,
		Signature: signature,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		logger.Printf("HandleMorseCommand: msg json marshal error: %v", err.Error())
    return
	}

	isBadLanguage := morse.ContainsBadLanguage(messageText)
  if isBadLanguage {
		logger.Printf("HandleMorseCommand: (%s) bad language: %v\n", client.deviceInfo.Id, messageText)
  }
	if isBadLanguage || client.deviceInfo.IsBad || client.shadowMuted {
		client.hub.broadcastChannelCluster(
			msgBytes,
			client.channel,
			client.deviceInfo.ClusterId,
			logger,
		)
		metrics.BadMessages.Add(1)
	} else {
		client.hub.broadcastChannel(msgBytes, client.channel, logger)
		metrics.Messages.Add(1)
	}
	// //notify the user that the message was sent
	{
		msg := MessageMorseStatus{
			Type: "messagestatus",
			Ok:   true,
		}
		msgBytes, err := json.Marshal(msg)
		if err != nil {
			logger.Printf("HandleMorseCommand: msg json marshal error: %v", err.Error())
      return
		}
		messageUser(client, msgBytes, logger)
	}
	//wpm metrics
	metrics.MessagesWpm.Observe(float64(cmd.Wpm))

}

