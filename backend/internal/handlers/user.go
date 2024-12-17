package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/validation"
)

type ServeUserInfo_req struct {
	Username string
}
type ServeUserInfo_ok struct {
	Username              string
	Callsign              string
	LastOnlineTimestamp   int64
	RegistrationTimestamp int64
}

func ServeUserInfo(
	logger *log.Logger,
	dbReadPool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		var req ServeUserInfo_req
		if err := validation.Bind(w, r, &req); err != nil {
			//Error response is already set by Bind
			return
		}

		queries := db.New(dbReadPool)
		res, err := queries.GetUser(r.Context(), req.Username)

		if err != nil {
			validation.RespondError(w, "Query failed", "", http.StatusInternalServerError)
			logger.Printf("ServeUserInfo: query error: %v", err.Error())
      return
		}

		resp := ServeUserInfo_ok{
			Username:              res.Username,
			Callsign:              res.Callsign,
			LastOnlineTimestamp:   res.LastOnlineTimestamp,
			RegistrationTimestamp: res.RegistrationTimestamp,
		}
		validation.RespondOk(w, resp)
	}
}

func ServeMe(
	logger *log.Logger,
	dbReadPool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		jwtData, err := auth.GetJwtData(r.Context())
		if err != nil {
			validation.RespondError(w, "session error", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: jwt data error: %v", err.Error())
      return
		}

		queries := db.New(dbReadPool)
		res, err := queries.GetUserFromId(r.Context(), jwtData.UserId)

		if err != nil {
			validation.RespondError(w, "Query failed", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: query error: %v", err.Error())
      return
		}

		resp := ServeUserInfo_ok{
			Username:              res.Username,
			Callsign:              res.Callsign,
			LastOnlineTimestamp:   res.LastOnlineTimestamp,
			RegistrationTimestamp: res.RegistrationTimestamp,
		}
		validation.RespondOk(w, resp)
	}
}
