package main

import (
	"log"
	"net/http"

  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
	// "github.com/robalb/morsechat/middleware"

)

func newServer(
	logger *log.Logger,
  config Config,
  hub *Hub,
  /* Put here all the dependencies for middlewares and routers */
  ) http.Handler{

  mux := chi.NewRouter()
  mux.Use(middleware.Logger)
  AddRoutes(
    mux,
    logger,
    config,
    hub,
    /* Put here all the dependencies for middlewares and routers */
    )

  return mux
}
