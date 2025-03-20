package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/robalb/morsechat/internal/config"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/morse"
	"github.com/robalb/morsechat/internal/validation"
)

type ServeReport_req struct {
  Text string   `json:"text" validate:"required,min=1"`
  Signature string   `json:"signature" validate:"required,min=1"` //TODO
}
func ServeReport(
	logger *log.Logger,
  config *config.Config,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ServeReport_req
		if err := validation.Bind(w, r, &req); err != nil {
			//Error response is already set by Bind
			return
		}

    device, err := deviceid.New(r)
    if err != nil {
      validation.RespondError(w, "internal error", "", http.StatusInternalServerError)
      logger.Printf("ServeWsInit: deviceID error: %v", err.Error())
      return
    }

    signedMessage, err := morse.DecryptMessage(req.Signature, config.SecretBytes)
    if err != nil{
			validation.RespondError(w, "Processing failed", "", http.StatusInternalServerError)
			logger.Printf("ServeReport: signature decryption failed : %v", err.Error())
      return
    }
    logger.Printf("ServeReport: (%s) reported : %v",device.Id, signedMessage)
    validation.RespondOk(w, OkResponse{Ok: "ok"})
  }
}

