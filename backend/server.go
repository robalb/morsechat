package main

import (
	"log"
	"net/http"

	"github.com/robalb/morsechat/middleware"
)

func newServer(
	logger *log.Logger,
  config Config,
  hub *Hub,
  /* Put here all the dependencies for middlewares and routers */
  ) http.Handler{

  mux := http.NewServeMux()
  AddRoutes(
    mux,
    logger,
    config,
    hub,
    /* Put here all the dependencies for middlewares and routers */
    )

  middlewares := middleware.CreateStack(
    middleware.Logging,
  )
	return middlewares(mux)
}
