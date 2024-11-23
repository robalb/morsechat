package main

import (
	"log"
	"net/http"
)

func newServer(
	logger *log.Logger,
  hub *Hub,
  /* Put here all the dependencies for middlewares and routers */
  ) http.Handler{

  mux := http.NewServeMux()
  AddRoutes(
    mux,
    logger,
    hub,
    /* Put here all the dependencies for middlewares and routers */
    )
	var handler http.Handler = mux
  
  //global middlewares

  return handler
}
