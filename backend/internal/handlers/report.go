package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/robalb/morsechat/internal/validation"
)

type ServeReport_req struct {
  Text string   `json:"text" validate:"required,min=1"`
  Signature string   `json:"signature" validate:"required,min=1"` //TODO
}
func ServeReport(
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ServeReport_req
		if err := validation.Bind(w, r, &req); err != nil {
			//Error response is already set by Bind
			return
		}

    validation.RespondOk(w, OkResponse{Ok: "ok"})
  }
}

