package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/robalb/morsechat/internal/db"
	"github.com/robalb/morsechat/internal/validation"
)

/*
Administrative endpoints.

These routes are mounted behind middleware.RequireAdmin, which verifies the
role against the database on every request. The handlers below therefore only
need to deal with their input and the database state.

Only moderator management and read-only ban activity are exposed here.
Admins are bootstrapped out of band with the `cmd/admin` command, so that a
compromised or mistyped environment variable can never silently grant admin
rights to an account.
*/

type AdminModeratorData struct {
	Username string `json:"username" validate:"required,min=3,max=20"`
}

type AdminModeratorListResponse struct {
	Moderators []ModerationUserResponse `json:"moderators"`
}

type AdminModeratorResponse struct {
	Moderator ModerationUserResponse `json:"moderator"`
}

type AdminBanActivityResponse struct {
	BanActions []ModerationBanActionResponse `json:"ban_actions"`
}

func ServeAdminListModerators(
	logger *log.Logger,
	dbReadPool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		errCtx := "ServeAdminListModerators"

		queries := db.New(dbReadPool)
		moderators, err := queries.ListModerators(r.Context())
		if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
			validation.RespondError(w, "query_failed", "", http.StatusInternalServerError)
			return
		}

		validation.RespondOk(w, AdminModeratorListResponse{
			Moderators: adaptUsers(moderators),
		})
	}
}

func ServeAdminSetModerator(
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return serveAdminModeratorUpdate(logger, dbReadPool, dbWritePool, true)
}

func ServeAdminRemoveModerator(
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return serveAdminModeratorUpdate(logger, dbReadPool, dbWritePool, false)
}

func serveAdminModeratorUpdate(
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
	isModerator bool,
) func(w http.ResponseWriter, r *http.Request) {
	errCtx := "ServeAdminModeratorUpdate"
	return func(w http.ResponseWriter, r *http.Request) {
		var reqData AdminModeratorData
		if err := validation.Bind(w, r, &reqData); err != nil {
			// Error response is already set by Bind
			return
		}

		queriesRead := db.New(dbReadPool)
		user, err := queriesRead.GetUser(r.Context(), reqData.Username)
		if err == sql.ErrNoRows {
			validation.RespondError(w, "user_not_found", "", http.StatusNotFound)
			return
		} else if err != nil {
			logger.Printf("%s: user query error: %v", errCtx, err.Error())
			validation.RespondError(w, "query_failed", "", http.StatusInternalServerError)
			return
		}

		if user.IsBanned != 0 {
			validation.RespondError(w, "user_banned", "", http.StatusBadRequest)
			return
		}

		moderatorValue := int64(0)
		if isModerator {
			moderatorValue = 1
		}

		queriesWrite := db.New(dbWritePool)
		_, err = queriesWrite.SetModerator(r.Context(), db.SetModeratorParams{
			IsModerator: moderatorValue,
			Username:    user.Username,
		})
		if err != nil {
			logger.Printf("%s: update error: %v", errCtx, err.Error())
			validation.RespondError(w, "update_failed", "", http.StatusInternalServerError)
			return
		}

		user.IsModerator = moderatorValue
		action := "promoted"
		if !isModerator {
			action = "demoted"
		}
		logger.Printf("Admin: %s moderator role for user: %s", action, user.Username)

		validation.RespondOk(w, AdminModeratorResponse{
			Moderator: adaptUsers([]db.User{user})[0],
		})
	}
}

func ServeAdminListBanActivity(
	logger *log.Logger,
	dbReadPool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		errCtx := "ServeAdminListBanActivity"

		query := r.URL.Query().Get("query")
		if len(query) < 2 {
			query = "%"
		}

		queries := db.New(dbReadPool)
		banActions, err := queries.GetLastBanEvents(r.Context(), db.GetLastBanEventsParams{
			ModeratorUsername: query,
			BaduserSession:    query,
			BaduserUsername:   query,
		})
		if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
			validation.RespondError(w, "query_failed", "", http.StatusInternalServerError)
			return
		}

		validation.RespondOk(w, AdminBanActivityResponse{
			BanActions: adaptBanActions(banActions),
		})
	}
}
