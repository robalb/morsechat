package middleware

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/validation"
)

func RequireValidSession(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
			_, err := auth.GetJwtData(r.Context())

			if err != nil {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), err.Error(), http.StatusUnauthorized)
				return
			}
			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}

func RequireAuthenticated(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
			jwtData, err := auth.GetJwtData(r.Context())

			if err != nil {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), err.Error(), http.StatusUnauthorized)
				return
			}

			if jwtData.IsAnonymous || jwtData.UserId == 0 {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), "Not Logged", http.StatusUnauthorized)
				return
			}

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}

func RequireModerator(ja *jwtauth.JWTAuth, dbReadPool *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
			jwtData, err := auth.GetJwtData(r.Context())

			if err != nil {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), err.Error(), http.StatusUnauthorized)
				return
			}

			// The role is stored in the database. JWT claims are only a cache
			// for the frontend: checking the database here makes role changes
			// (promotions and revocations) effective immediately.
			queries := db.New(dbReadPool)
			isModerator, err := queries.IsModerator(r.Context(), jwtData.UserId)
			if err != nil {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), "Not a moderator", http.StatusUnauthorized)
				return
			}
			if isModerator == 0 {
				// Admins have all the moderation capabilities. Checking this
				// here keeps a single source of truth for both roles.
				isAdmin, adminErr := queries.IsAdmin(r.Context(), jwtData.UserId)
				if adminErr != nil || isAdmin == 0 {
					validation.RespondError(w, http.StatusText(http.StatusUnauthorized), "Not a moderator", http.StatusUnauthorized)
					return
				}
			}

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}

func RequireAdmin(ja *jwtauth.JWTAuth, dbReadPool *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
			jwtData, err := auth.GetJwtData(r.Context())

			if err != nil {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), err.Error(), http.StatusUnauthorized)
				return
			}

			queries := db.New(dbReadPool)
			isAdmin, err := queries.IsAdmin(r.Context(), jwtData.UserId)
			if err != nil || isAdmin == 0 {
				validation.RespondError(w, http.StatusText(http.StatusUnauthorized), "Not an admin", http.StatusUnauthorized)
				return
			}

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}
