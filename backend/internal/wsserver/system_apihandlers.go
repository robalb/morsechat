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
	logger *log.Logger,
	config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
	metrics *monitoring.Metrics,
) {
  switch m := (*message).(type){
    case SysMessageBan:
      //PASS
      //TODO(al)
      logger.Printf("%s", m.Username)

  }
}
