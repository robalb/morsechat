package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/db"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/validation"
)

type ModerationListQuery struct {
    Name        string   `json:"name" validate:"required,min=0,max=200"`
}

func ServeModerationList(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
    errCtx := "ServeModerationList"

		var reqData ModerationListQuery
		if err := validation.Bind(w, r, &reqData); err != nil {
			//Error response is already set by Bind
			return
		}


    // set a wildcard query when no filter is provided
    query := reqData.Name
    if len(query) < 2 {
      query = "%"
    }

		queries := db.New(dbReadPool)
    resReports, err := queries.GetLastReports(r.Context())
    if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
    }
    banReports, err := queries.GetLastBanEvents(r.Context())
    if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
    }
    bannedRes, err := queries.GetLastBanned(r.Context(), query)
    if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
    }
    bannedResAnon, err := queries.GetLastBannedAnon(r.Context(), query)

    validation.RespondOk(w, ModerationListResponse{
      Users:      adaptUsers(bannedRes),
      AnonUsers:  adaptAnonUsers(bannedResAnon),
      BanActions: adaptBanActions(banReports),
      Reports:    adaptReportActions(resReports),
    })
  }
}



type ModerationBanData struct {
  BaduserId  int64 `json:"baduser_id"`
  BaduserSession string `json:"baduser_session"`
  ModeratorNotes string `json:"notes"`
  IsBanRevert bool `json:"is_revert"`
}

func ServeModerationBan(
	logger *log.Logger,
	tokenAuth *jwtauth.JWTAuth,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
    errCtx := "ServeModerationBan"

		var reqData ModerationBanData
		if err := validation.Bind(w, r, &reqData); err != nil {
			//Error response is already set by Bind
			return
		}

		currentJwtData, err := auth.GetJwtData(r.Context())
    if err != nil {
			logger.Printf("%s: jwt auth error: %v", errCtx, err.Error())
    }

    // refresh moderation status
		queriesRead := db.New(dbReadPool)
    res, err := queriesRead.IsModerator(r.Context(), currentJwtData.UserId)
    if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
    }
    if res == 0 {
      validation.RespondError(w, "Data query error", "", http.StatusBadRequest)
			logger.Printf("%s: invalid access: %v", errCtx, err.Error())
      return
    }

		queries := db.New(dbWritePool)
    banReason := "manual action"
    isBanRevertInt := int64(0)
    isBannedInt := int64(1)
    if reqData.IsBanRevert {
      isBanRevertInt = 1
      isBannedInt = 0
    }

    //record the ban action in the db event logs
    _, err = queries.RecordBanAction(r.Context(), db.RecordBanActionParams{ 
      ModeratorID: currentJwtData.UserId,
      BaduserID: sql.NullInt64{ 
        Int64: reqData.BaduserId,
        Valid: reqData.BaduserId != 0,
      },
      BaduserSession: reqData.BaduserSession,
      ModeratorNotes: reqData.ModeratorNotes,
      IsBanRevert: isBanRevertInt,
      Reason: banReason,
    })
    if err != nil {
			logger.Printf("%s: record insert failed: %v", errCtx, err.Error())
      validation.RespondError(w, "ban_failed", "", http.StatusInternalServerError)
      return
    }

    //update the ban status in the users db table
    if reqData.BaduserId == 0 {
      // the user we are banning / unbanning is anonymous
      //add or edit an entry to the anon_users, with the banned status
      _, err = queries.CreateAnonUser(r.Context(), db.CreateAnonUserParams{ 
        IsBanned: isBannedInt,
        LastSession: reqData.BaduserSession,
      })
      if err != nil {
        logger.Printf("%s: anonuser creation failed: %v", errCtx, err.Error())
        validation.RespondError(w, "ban_failed", "", http.StatusInternalServerError)
        return
      }
    } else {
      // the user we are banning / unbanning is NOT anonymous
      // update the banned status in the user table
      _, err = queries.UpdateBanned(r.Context(), db.UpdateBannedParams{ 
        IsBanned: isBannedInt,
        ID: reqData.BaduserId,
      })
      if err != nil {
        logger.Printf("%s: user update failed: %v", errCtx, err.Error())
        validation.RespondError(w, "ban_failed", "", http.StatusInternalServerError)
        return
      }
    }

    //perform the actual ban via the deviceID api
    if reqData.IsBanRevert{
      deviceid.UndoBan(reqData.BaduserSession)
    } else {
      deviceid.Ban(reqData.BaduserSession)
    }

    //TODO(al) communicate to the hub that a device must be kicked
    if !reqData.IsBanRevert{
      //TODO(al)
    }

    validation.RespondOk(w, "ok")
  }}
