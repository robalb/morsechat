package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/validation"
)


type RegisterData struct {
	Username string `json:"username" validate:"required,min=3,max=20"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=255"`
	Callsign string `json:"callsign" validate:"required,min=4,max=10"`
}
type RegisterResp struct{
  
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

    queries := db.New(dbWritePool)
    res, err := queries.CreateUser(r.Context(), db.CreateUserParams{
      Username: regData.Username,
      Callsign: regData.Callsign,
      RegistrationSession: "",
    })
    if err != nil{
      validation.RespondError(w, "User registration failed", "", http.StatusBadRequest)
      logger.Printf("ServeRegister: query error: %v", err.Error())
      return
    }
    id, err := res.LastInsertId()
    if err != nil{
      validation.RespondError(w, "User registration id failed", "", http.StatusBadRequest)
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
		expiration := time.Now().Add(365 * 24 * time.Hour)
		tokenString, err := auth.EncodeJwt(tokenAuth, jwtData, expiration)
		if err != nil {
      validation.RespondError(w, "Cookie set error", "", http.StatusInternalServerError)
      logger.Printf("ServeRegister: Jwt creation error: %v", err.Error())
      return
		}
    //TODO: remove WARNING: unsafe to keep this here
		logger.Printf("token: %v ", tokenString)
		cookie := http.Cookie{Name: "jwt", Value: tokenString, Expires: expiration}
		http.SetCookie(w, &cookie)
    validation.RespondOk(w, "Ok")
	}
}

func ServeSessInit(
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
		expiration := time.Now().Add(365 * 24 * time.Hour)
		tokenString, err := auth.EncodeJwt(tokenAuth, jwtData, expiration)
		if err != nil {
			logger.Printf("err: %v", err.Error())
		}
		logger.Printf("token: %v |", tokenString)
		cookie := http.Cookie{Name: "jwt", Value: tokenString, Expires: expiration}
		http.SetCookie(w, &cookie)
	}
}

func ServeLogin(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		jwtData := auth.JwtData{
			UserId:      0,
			IsAnonymous: true,
			IsAdmin:     false,
			IsModerator: false,
			Username:    "foo",
			Callsign:    "US000X",
		}
		expiration := time.Now().Add(365 * 24 * time.Hour)
		tokenString, err := auth.EncodeJwt(tokenAuth, jwtData, expiration)
		if err != nil {
			logger.Printf("err: %v", err.Error())

		}
		logger.Printf("token: %v |", tokenString)
	}
}
