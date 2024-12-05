package middleware

import (
	"net/http"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/validation"
)

func RequireValidSession(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
			token, _, err := jwtauth.FromContext(r.Context())

			if err != nil {
        validation.JSONError(w, http.StatusText(http.StatusUnauthorized) , err.Error(), http.StatusUnauthorized)
				return
			}

			if token == nil {
				validation.JSONError(w, http.StatusText(http.StatusUnauthorized), "", http.StatusUnauthorized)
				return
			}

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}

func RequireModerator(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
      jwtData, err := auth.GetJwtData(r.Context())

			if err != nil {
        validation.JSONError(w, http.StatusText(http.StatusUnauthorized) , err.Error(), http.StatusUnauthorized)
				return
			}

      if !jwtData.IsModerator{
				validation.JSONError(w, http.StatusText(http.StatusUnauthorized), "Not a moderator", http.StatusUnauthorized)
      }

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}

func RequireAdmin(ja *jwtauth.JWTAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		hfn := func(w http.ResponseWriter, r *http.Request) {
      jwtData, err := auth.GetJwtData(r.Context())

			if err != nil {
        validation.JSONError(w, http.StatusText(http.StatusUnauthorized) , err.Error(), http.StatusUnauthorized)
				return
			}

      if !jwtData.IsAdmin{
				validation.JSONError(w, http.StatusText(http.StatusUnauthorized), "Not an admin", http.StatusUnauthorized)
      }

			// Token is authenticated, pass it through
			next.ServeHTTP(w, r)
		}
		return http.HandlerFunc(hfn)
	}
}
