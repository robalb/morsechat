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
  switch m := (*message).(type){
  case SysMessageBan:
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
  default:
    logger.Printf( "SystemRequestMux: unknown message type %T", m)
  }
}

func handleBanSysCommand(
	cmd *SysMessageBan,
	hub *Hub,
	logger *log.Logger,
	metrics *monitoring.Metrics,
) {
  errCtx := "handleBanSysCommand"

  if cmd.Username == "" && cmd.Device == "" {
    logger.Printf("%s: emtpy ban parameters", errCtx)
    return
  }

  for client := range hub.clients{
    if client.userInfo.Username == cmd.Username || 
    client.deviceInfo.Id == cmd.Device {
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
