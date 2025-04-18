package server

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/config"
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
	/* Put here all the dependencies for middlewares and routers */
) {

	ws := chi.NewRouter()
	rootMux.Mount("/ws", ws)
	ws.Use(middleware.RequireValidSession(tokenAuth))
	ws.Get("/init", wsserver.ServeWsInit(logger, hub))

	v1 := chi.NewRouter()
	rootMux.Mount("/api/v1", v1)

	//Non authenticated routes
	v1.Group(func(r chi.Router) {
		r.Post("/register", handlers.ServeRegister(logger, tokenAuth, dbReadPool, dbWritePool))
		r.Post("/login", handlers.ServeLogin(logger, tokenAuth, dbReadPool, dbWritePool))
		r.Post("/sess_init", handlers.ServeSessInit(logger, tokenAuth, dbReadPool))
		r.Post("/validate_callsign", handlers.ServeValidateCallsign(logger, dbReadPool))

		r.Route("/chat", func(r chi.Router) {
			r.Use(middleware.RequireValidSession(tokenAuth))
			r.Post("/report", handlers.ServeReport(logger, config, dbReadPool, dbWritePool))
		})
	})

	//Authenticated routes
	v1.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuthenticated(tokenAuth))
		r.Post("/logout", handlers.ServeLogout(logger, tokenAuth))
		r.Post("/update_settings", handlers.ServeUpdateSettings(logger, dbReadPool, dbWritePool))

		r.Route("/moderation", func(r chi.Router) {
			r.Use(middleware.RequireModerator(tokenAuth))
			r.Post("/list", handlers.ServeModerationList(logger, tokenAuth, dbReadPool, dbWritePool))
			r.Post("/ban", handlers.ServeModerationBan(logger, tokenAuth, dbReadPool, dbWritePool, hub))
		})
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.RequireAdmin(tokenAuth))
			r.Get("/list_moderators", serveTODO)
			r.Post("/set_moderator", serveTODO)
			r.Post("/remove_moderator", serveTODO)
			r.Get("/list_ban_activity", serveTODO)
		})

		r.Route("/user", func(r chi.Router) {
			r.Post("/info", handlers.ServeUserInfo(logger, dbReadPool))
			r.Get("/me", handlers.ServeMe(logger, dbReadPool))
		})

	})

	//TODO remove
	v1.Route("/test", func(r chi.Router) {
		r.Get("/time", serveTestCtx)
	})

}

//TODO: move to dedicated file anything below this line
//---------

func serveTestCtx(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	select {
	case <-ctx.Done():
		log.Println("ctx done, abrupt end. reason:")
		log.Println(ctx.Err())
		http.Error(w, ctx.Err().Error(), http.StatusInternalServerError)
	case <-time.After(4 * time.Second):
		log.Println("10s elapsed")
		fmt.Fprintf(w, "10s elapsed")
	}

}

func serveTODO(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Api endpoint not implemented", http.StatusInternalServerError)
}
