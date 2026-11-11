package server

import (
	"database/sql"
	"log"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/config"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/handlers"
	"github.com/robalb/morsechat/internal/middleware"
	"github.com/robalb/morsechat/internal/monitoring"
	"github.com/robalb/morsechat/internal/wsserver"
)

func AddRoutes(
	rootMux *chi.Mux,
	logger *log.Logger,
	config *config.Config,
	hub *wsserver.Hub,
	tokenAuth *jwtauth.JWTAuth,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
	metrics *monitoring.Metrics,
	deviceIdConfig *deviceid.Config,
	/* Put here all the dependencies for middlewares and routers */
) {

	ws := chi.NewRouter()
	rootMux.Mount("/ws", ws)
	ws.Use(middleware.RequireValidSession(tokenAuth))
	ws.Get("/init", wsserver.ServeWsInit(logger, hub, deviceIdConfig))

	v1 := chi.NewRouter()
	rootMux.Mount("/api/v1", v1)

	//Non authenticated routes
	v1.Group(func(r chi.Router) {
		r.Post("/register", handlers.ServeRegister(logger, tokenAuth, dbReadPool, dbWritePool, deviceIdConfig, metrics))
		r.Post("/login", handlers.ServeLogin(logger, tokenAuth, dbReadPool, dbWritePool, deviceIdConfig, metrics))
		r.Post("/sess_init", handlers.ServeSessInit(logger, tokenAuth, dbReadPool, deviceIdConfig))
		r.Post("/validate_callsign", handlers.ServeValidateCallsign(logger, dbReadPool))

		r.Route("/chat", func(r chi.Router) {
			r.Use(middleware.RequireValidSession(tokenAuth))
			r.Post("/report", handlers.ServeReport(logger, config, dbReadPool, dbWritePool, deviceIdConfig, metrics))
		})
	})

	//Authenticated routes
	v1.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuthenticated(tokenAuth))
		r.Post("/logout", handlers.ServeLogout(logger, tokenAuth))
		r.Post("/update_settings", handlers.ServeUpdateSettings(logger, dbReadPool, dbWritePool))

		r.Route("/moderation", func(r chi.Router) {
			r.Use(middleware.RequireModerator(tokenAuth, dbReadPool))
			r.Post("/list", handlers.ServeModerationList(logger, tokenAuth, dbReadPool, dbWritePool, deviceIdConfig))
			r.Post("/ban", handlers.ServeModerationBan(logger, tokenAuth, dbReadPool, dbWritePool, hub, deviceIdConfig))
			r.Post("/mute", handlers.ServeModerationMute(logger, tokenAuth, dbReadPool, dbWritePool, hub, deviceIdConfig))
		})
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.RequireAdmin(tokenAuth, dbReadPool))
			r.Get("/list_moderators", handlers.ServeAdminListModerators(logger, dbReadPool))
			r.Post("/set_moderator", handlers.ServeAdminSetModerator(logger, dbReadPool, dbWritePool))
			r.Post("/remove_moderator", handlers.ServeAdminRemoveModerator(logger, dbReadPool, dbWritePool))
			r.Get("/list_ban_activity", handlers.ServeAdminListBanActivity(logger, dbReadPool))
		})

		r.Route("/user", func(r chi.Router) {
			r.Post("/info", handlers.ServeUserInfo(logger, dbReadPool))
			r.Get("/me", handlers.ServeMe(logger, dbReadPool))
		})

	})
}
