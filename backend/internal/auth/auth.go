package auth

import (
	"context"
	"errors"
	"time"

	"github.com/go-chi/jwtauth/v5"
)

var JWtDataVersion = "1"

type JwtData struct{
  UserId      int
  IsAnonymous bool
  IsAdmin     bool
  IsModerator bool
  IsVerified  bool
  Username    string
  Callsign    string
}

func GetJwtData(ctx context.Context) (jwtData JwtData, err error){
  token, claims, err := jwtauth.FromContext(ctx)
  if err != nil {
    return
  }
  if token == nil {
    err = errors.New("Nil jwt token")
  }
  jwtData, ok := claims[JWtDataVersion].(JwtData)
  if !ok{
    err = errors.New("Failed struct data extraction")
  }
  return
}

func EncodeJwt(tokenAuth *jwtauth.JWTAuth, data JwtData, expiration time.Time) (tokenString string, err error){
  claims :=map[string]interface{}{JWtDataVersion: data} 
  jwtauth.SetExpiry(claims, expiration)
  jwtauth.SetIssuedNow(claims)
    _, tokenString, err = tokenAuth.Encode(claims)
  return
}
