package auth

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-chi/jwtauth/v5"
)

var JWtDataVersion = "1"

type JwtData struct {
	UserId      int64  `json:"uid"`
	IsAnonymous bool   `json:"ian"`
	IsAdmin     bool   `json:"iad"`
	IsModerator bool   `json:"im"`
	IsVerified  bool   `json:"iv"`
	Username    string `json:"u"`
	Callsign    string `json:"c"`
}

func GetJwtData(ctx context.Context) (jwtData JwtData, err error) {
	token, claims, err := jwtauth.FromContext(ctx)
	if err != nil {
		return
	}
	if token == nil {
		err = errors.New("Nil jwt token")
	}
	currentVersion, ok := claims[JWtDataVersion].(string)
	if !ok {
		err = errors.New("Failed struct data extraction. Version mismatch")
		return
	}
	err = json.Unmarshal([]byte(currentVersion), &jwtData)
	return
}

func EncodeJwt(tokenAuth *jwtauth.JWTAuth, data JwtData, expiration time.Time) (tokenString string, err error) {
	encoded, err := json.Marshal(data)
	if err != nil {
		return
	}
	claims := map[string]interface{}{JWtDataVersion: string(encoded)}
	jwtauth.SetExpiry(claims, expiration)
	jwtauth.SetIssuedNow(claims)
	_, tokenString, err = tokenAuth.Encode(claims)
	return
}
