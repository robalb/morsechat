package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/jwtauth/v5"
	"github.com/mattn/go-sqlite3"
	"github.com/robalb/morsechat/internal/argon2id"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/morse"
	"github.com/robalb/morsechat/internal/validation"
)

// response object used by both login, register, and sess_init
type AuthResponse struct {
	IsAnonymous bool   `json:"is_anonymous"`
	IsAdmin     bool   `json:"is_admin"`
	IsModerator bool   `json:"is_moderator"`
	Username    string `json:"username"`
	Callsign    string `json:"callsign"`
	Country     string `json:"country"`
  Settings    string `json:"settings"`
}

type RegisterData struct {
	Username string `json:"username" validate:"required,min=3,max=20"`
	Password string `json:"password" validate:"required,min=8,max=255"`
	Callsign string `json:"callsign" validate:"required,min=4,max=10"`
}

func ServeRegister(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		var regData RegisterData
		if err := validation.Bind(w, r, &regData); err != nil {
			//Error response is already set by Bind
			return
		}

    countryCode, ok := morse.ParseCallsign(regData.Callsign)
    if (!ok){
			validation.RespondError(w, "Invalid callsign", "", http.StatusBadRequest)
			return
    }

		//fail if already logged
		currentJwtData, err := auth.GetJwtData(r.Context())
		if err == nil && !currentJwtData.IsAnonymous && currentJwtData.UserId != 0 {
			validation.RespondError(w, "Already logged in", "", http.StatusBadRequest)
			return
		}

		hash, err := argon2id.CreateHash(regData.Password, argon2id.DefaultParams)
		if err != nil {
			validation.RespondError(w, "User registration failed", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: password hash error: %v", err.Error())
			return
		}

		queries := db.New(dbWritePool)
		res, err := queries.CreateUser(r.Context(), db.CreateUserParams{
			Username:            regData.Username,
			Password:            hash,
			Callsign:            regData.Callsign,
      Country:             countryCode,
			RegistrationSession: "",
		})
    if sqliteErr, ok := err.(sqlite3.Error); ok {
      if sqliteErr.Code == sqlite3.ErrConstraint {
        if strings.Contains(sqliteErr.Error(), "username"){
          validation.RespondError(w, "username_taken", "", http.StatusBadRequest)
          return
        }else if strings.Contains(sqliteErr.Error(), "callsign"){
          validation.RespondError(w, "callsign_taken", "", http.StatusBadRequest)
          return
        }
      }
    }
		if err != nil {
			validation.RespondError(w, "User registration failed", "", http.StatusBadRequest)
			logger.Printf("ServeRegister: query error: %v", err.Error())
			return
		}
		id, err := res.LastInsertId()
		if err != nil {
			validation.RespondError(w, "User registration failed", "", http.StatusBadRequest)
			logger.Printf("ServeRegister: query id error: %v", err.Error())
			return
		}

		jwtData := auth.JwtData{
			UserId:      id,
			IsAnonymous: false,
			IsAdmin:     false,
			IsModerator: false,
			Username:    regData.Username,
			Callsign:    regData.Callsign,
		}
    err = auth.SetJwtCookie(w, tokenAuth, jwtData)
		if err != nil {
			validation.RespondError(w, "Session creation error", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: Jwt creation error: %v", err.Error())
			return
    }
		validation.RespondOk(w, AuthResponse{
			IsAnonymous: jwtData.IsAnonymous,
			IsAdmin:     jwtData.IsAdmin,
			IsModerator: jwtData.IsModerator,
			Username:    jwtData.Username,
			Callsign:    jwtData.Callsign,
      Country:     countryCode,
      Settings:    "",
		})
	}
}

/*
If the user is not logged this endpoints acts as a sort of
anonymous login, setting a cookie with limited credentials
that will allows a connection to the websocket
*/
func ServeSessInit(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		//If the user already has a session, just return the session data,
		//But don't set any jwt cokie.
		currentJwtData, err := auth.GetJwtData(r.Context())
		if err == nil {
			validation.RespondOk(w, AuthResponse{
				IsAnonymous: currentJwtData.IsAnonymous,
				IsAdmin:     currentJwtData.IsAdmin,
				IsModerator: currentJwtData.IsModerator,
				Username:    currentJwtData.Username,
				Callsign:    currentJwtData.Callsign,
        Country:     "US", //TODO
        Settings:    "",   //TODO
			})
			return
		}

		//TODO: content negotiation
		jwtData := auth.JwtData{
			UserId:      0,
			IsAnonymous: true,
			IsAdmin:     false,
			IsModerator: false,
			Username:    "",
			Callsign:    "US000X",
		}
    err = auth.SetJwtCookie(w, tokenAuth, jwtData)
		if err != nil {
			validation.RespondError(w, "Session creation error", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: Jwt creation error: %v", err.Error())
			return
    }
		validation.RespondOk(w, AuthResponse{
			IsAnonymous: jwtData.IsAnonymous,
			IsAdmin:     jwtData.IsAdmin,
			IsModerator: jwtData.IsModerator,
			Username:    jwtData.Username,
			Callsign:    jwtData.Callsign,
      Country:     "US", //TODO
      Settings:    "",   //TODO
		})
	}
}

// Similar to serveSessInit, this endpoit
// will overwrite the current jwt with an anonymous jwt
func ServeLogout(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		//TODO: content negotiation
		jwtData := auth.JwtData{
			UserId:      0,
			IsAnonymous: true,
			IsAdmin:     false,
			IsModerator: false,
			Username:    "",
			Callsign:    "US000X",
		}
    err := auth.SetJwtCookie(w, tokenAuth, jwtData)
		if err != nil {
			validation.RespondError(w, "Session creation error", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: Jwt creation error: %v", err.Error())
			return
    }
		validation.RespondOk(w, AuthResponse{
			IsAnonymous: jwtData.IsAnonymous,
			IsAdmin:     jwtData.IsAdmin,
			IsModerator: jwtData.IsModerator,
			Username:    jwtData.Username,
			Callsign:    jwtData.Callsign,
      Country:     "US", //TODO
      Settings:    "",   //TODO
		})
	}
}



type LoginData struct {
	Username string `json:"username" validate:"required,min=3,max=20"`
	Password string `json:"password" validate:"required,min=8,max=255"`
}

func ServeLogin(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		var reqData LoginData
		if err := validation.Bind(w, r, &reqData); err != nil {
			//Error response is already set by Bind
			return
		}

		//fail if already logged
		currentJwtData, err := auth.GetJwtData(r.Context())
		if err == nil && !currentJwtData.IsAnonymous && currentJwtData.UserId != 0 {
			validation.RespondError(w, "Already logged in", "", http.StatusBadRequest)
			return
		}

		queries := db.New(dbReadPool)
		res, err := queries.GetUser(r.Context(), reqData.Username)
		if err == sql.ErrNoRows {
			validation.RespondError(w, "invalid_credentials", "", http.StatusBadRequest)
      return
		} else if err != nil {
			validation.RespondError(w, "User login failed", "", http.StatusBadRequest)
			logger.Printf("ServeLogin: query error: %v", err.Error())
			return
		}

		match, err := argon2id.ComparePasswordAndHash(reqData.Password, res.Password)
		if err != nil {
			validation.RespondError(w, "User login failed", "", http.StatusBadRequest)
			logger.Printf("ServeLogin: argon2id compare error: %v", err.Error())
			return
		}
		if !match {
			validation.RespondError(w, "invalid_credentials", "", http.StatusBadRequest)
			return
		}

		jwtData := auth.JwtData{
			UserId:      res.ID,
			IsAnonymous: false,
			IsAdmin:     false,
			IsModerator: res.IsModerator != 0,
			Username:    res.Username,
			Callsign:    res.Callsign,
		}
    err = auth.SetJwtCookie(w, tokenAuth, jwtData)
		if err != nil {
			validation.RespondError(w, "Session creation error", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: Jwt creation error: %v", err.Error())
			return
    }
		validation.RespondOk(w, AuthResponse{
			IsAnonymous: jwtData.IsAnonymous,
			IsAdmin:     jwtData.IsAdmin,
			IsModerator: jwtData.IsModerator,
			Username:    jwtData.Username,
			Callsign:    jwtData.Callsign,
      Country:     res.Callsign,
      Settings:    "", //TODO
		})
	}
}


type CallsignData struct {
	Callsign string `json:"callsign" validate:"required,min=3,max=20"`
}
type CallsignOk struct {
  Ok string `json:"ok"`
}

func ServeValidateCallsign(
	logger *log.Logger,
	dbReadPool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {

		var reqData CallsignData
		if err := validation.Bind(w, r, &reqData); err != nil {
			//Error response is already set by Bind
			return
		}

    _, ok := morse.ParseCallsign(reqData.Callsign)
    if (!ok){
			validation.RespondError(w, "invalid_callsign", "", http.StatusBadRequest)
			return
    }

		queries := db.New(dbReadPool)
		res, err := queries.GetCallsign(r.Context(), reqData.Callsign)

    logger.Printf("res: %v", res)
    if err == sql.ErrNoRows {
      resp := CallsignOk{
        Ok: "ok",
      }
      validation.RespondOk(w, resp)
      return
    }else if err != nil {
			validation.RespondError(w, "query_failed", "", http.StatusInternalServerError)
			logger.Printf("ServeRegister: query error: %v", err.Error())
      return
		}
    validation.RespondError(w, "already_taken", "", http.StatusBadRequest)
    return
	}
}
