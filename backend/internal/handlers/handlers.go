package handlers

import (
	"log"
	"net/http"

	"github.com/robalb/morsechat/internal/validation"
)

type UserLogin struct {
    Username  string `json:"username" validate:"required"`
    Email string `json:"email" validate:"required,email"`
}

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
