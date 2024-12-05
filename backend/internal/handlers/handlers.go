package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/validation"
)

type UserLogin struct {
    Username  string `json:"username" validate:"required"`
    Email string `json:"email" validate:"required,email"`
}

//TODO: remove, replace with a real endpoint
func ServeDbHealth(deps int) func(http.ResponseWriter, *http.Request){

  return func(w http.ResponseWriter, r *http.Request) {
    var user UserLogin;
    if err := validation.Bind(w, r, &user); err != nil{
      //Error response is already set by Bind
      return
    }
    log.Printf("parsed user: %v", user);
    
  }
}


func ServeSessInit(
  logger *log.Logger,
  tokenAuth *jwtauth.JWTAuth,
) func(w http.ResponseWriter, r *http.Request){
  return func(w http.ResponseWriter, r *http.Request){

    //TODO: content negotiation
    jwtData := auth.JwtData{
      UserId: 0, 
      IsAnonymous: true,
      IsAdmin:false,
      IsModerator:false,
      Username: "",
      Callsign: "US000X",
    }
    expiration := time.Now().Add(365 * 24 * time.Hour)
    tokenString, err := auth.EncodeJwt(tokenAuth, jwtData, expiration)
    if err != nil {
    logger.Printf("err: %v", err.Error())
    }
    logger.Printf("token: %v |", tokenString)
    cookie := http.Cookie{Name: "jwt",Value: tokenString, Expires:expiration}
    http.SetCookie(w, &cookie) 
  }
}


func ServeLogin(
  logger *log.Logger,
  tokenAuth *jwtauth.JWTAuth,
) func(w http.ResponseWriter, r *http.Request){
  return func(w http.ResponseWriter, r *http.Request){
    jwtData := auth.JwtData{
      UserId: 0, 
      IsAnonymous: true,
      IsAdmin:false,
      IsModerator:false,
      Username: "foo",
      Callsign: "US000X",
    }
    expiration := time.Now().Add(365 * 24 * time.Hour)
    tokenString, err := auth.EncodeJwt(tokenAuth, jwtData, expiration)
    if err != nil {
    logger.Printf("err: %v", err.Error())
      
    }
    logger.Printf("token: %v |", tokenString)
  }
}
