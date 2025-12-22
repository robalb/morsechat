// Api request handlers for the internal system requests API
package wsserver

import (
	"context"
	"database/sql"
	"log"

	"github.com/robalb/morsechat/internal/config"
	"github.com/robalb/morsechat/internal/monitoring"
)

func systemRequestMux(
	message *SystemRequest,
	ctx context.Context,
	hub *Hub,
	logger *log.Logger,
	config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
	metrics *monitoring.Metrics,
) {
	switch m := (*message).(type) {
	case SysMessageKick:
		handleBanSysCommand(
			&m,
			hub,
			logger,
			metrics,
		)
	case SysMessageBroadcast:
		handleBroadcastSysCommand(
			&m,
			hub,
			logger,
		)
	case SysMessageMute:
		handleMuteSysCommand(
			&m,
			hub,
		)
	default:
		logger.Printf("SystemRequestMux: unknown message type %T", m)
	}
}

func handleMuteSysCommand(
	cmd *SysMessageMute,
	hub *Hub,
) {
	for client := range hub.clients {
		if cmd.Callsign != "" && client.userInfo.Callsign == cmd.Callsign {
			client.shadowMuted = cmd.Mute
		}
	}
}

func handleBanSysCommand(
	cmd *SysMessageKick,
	hub *Hub,
	logger *log.Logger,
	metrics *monitoring.Metrics,
) {
	errCtx := "handleBanSysCommand"

	if cmd.Username == "" && cmd.Device == "" {
		logger.Printf("%s: emtpy ban parameters", errCtx)
		return
	}

	for client := range hub.clients {
		if client.deviceInfo.Id == cmd.Device || (client.userInfo.IsAnonymous == false && client.userInfo.Username == cmd.Username) {
			BroadcastUserLeft(client.channel, client, logger)
			delete(hub.clients, client)
			close(client.send)
			updateOnlineUsersGauge(hub, metrics)
		}
	}
}

func handleBroadcastSysCommand(
	cmd *SysMessageBroadcast,
	hub *Hub,
	logger *log.Logger,
) {
	channelExists := config_channels[cmd.channel]
	if channelExists {
		hub.broadcastChannel(cmd.message, cmd.channel, logger)
	} else {
		hub.broadcastAll(cmd.message, logger)
	}
}
