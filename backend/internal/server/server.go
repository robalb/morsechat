package server

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/robalb/morsechat/internal/config"
	localmiddleware "github.com/robalb/morsechat/internal/middleware"
)

func NewServer(
	logger *log.Logger,
  config config.Config,
  hub *Hub,
  /* Put here all the dependencies for middlewares and routers */
  ) http.Handler{

  mux := chi.NewRouter()
  mux.Use(localmiddleware.RealIPFromHeaders("X-Forwarded-For")) //TODO: security issue. document
  mux.Use(middleware.Logger)
  mux.Use(middleware.Recoverer)
  mux.Use(middleware.Heartbeat("/health"))
  mux.Use(cors.Handler(cors.Options{
    // AllowedOrigins:   []string{"https://foo.com"}, // Use this to allow specific origin hosts
    AllowedOrigins:   []string{"https://*", "http://*"},
    // AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
    ExposedHeaders:   []string{"Link"},
    AllowCredentials: false,
    MaxAge:           300, // Maximum value not ignored by any of major browsers
  }))

  AddRoutes(
    mux,
    logger,
    config,
    hub,
    /* Put here all the dependencies for middlewares and routers */
    )

  return mux
}
