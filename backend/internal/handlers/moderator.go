package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/jwtauth/v5"
	"github.com/robalb/morsechat/internal/auth"
	"github.com/robalb/morsechat/internal/db"
	deviceid "github.com/robalb/morsechat/internal/godeviceid"
	"github.com/robalb/morsechat/internal/validation"
)

/*

Moderation and bans

A ban can be either:
- username ban
- device ban
- both

an UnBann can be either:
- username unbann
- device unbann
- both

When in doubt, it's better to ban and
unbann all data that is available.
For example, user reports provide both
the username and device when the reported
user is logged. a ban from those logs
should be on both datapoints.

Behind the scenes, the ban system will make sure that username and devices are properly grouped
and clustered. when you ban a username, all the devices associated to it will also be banned.
- If you want to unbann a user, you must explicitly unbann by user, not only by previous devices
- When you unbann a device (eg. false positive), that device will simply gain an anti-affinity
to the current banned cluster, and loose the ban status.
all other devices that for some reason were in a similar cluster,
and received similar ban status will maintain their ban status


*/

type ModerationListQuery struct {
    Query   string   `json:"query" validate:"required,min=0,max=200"`
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
    query := reqData.Query
    if len(query) < 2 {
      query = "%"
    }

		queries := db.New(dbReadPool)
    resReports, err := queries.GetLastReports(r.Context(), db.GetLastReportsParams{ 
      ReporterUsername: query,
      ReporterSession: query,
      BaduserUsername: query,
      BaduserSession: query,
    })
    if err != nil {
			logger.Printf("%s: query error: %v", errCtx, err.Error())
    }
    banReports, err := queries.GetLastBanEvents(r.Context(), db.GetLastBanEventsParams{ 
      ModeratorUsername: query,
      BaduserSession: query,
      BaduserUsername: query,
    })
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

    device, err := deviceid.New(r)
    if err != nil {
      validation.RespondError(w, "internal error", "", http.StatusInternalServerError)
      logger.Printf("%s: deviceID error: %v", errCtx, err.Error())
      return
    }

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
      ModeratorUsername: currentJwtData.Username,
      BaduserID: sql.NullInt64{ 
        Int64: reqData.BaduserId,
        Valid: reqData.BaduserId != 0,
      },
      //A quirk of this spefici query: the content of BaduserId must be
      //replicated in this other ID field
      ID: reqData.BaduserId,
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

    //perform the actual ban or unbann via the deviceID api
    if reqData.IsBanRevert{
      if len(reqData.BaduserSession) > 0 {
        deviceid.UndoBan(reqData.BaduserSession)
      }
      if reqData.BaduserId != 0 {
        //TODO: use username string
        deviceid.UndoBanIdentity(strconv.FormatInt(reqData.BaduserId, 10))
      }
    } else {
      if len(reqData.BaduserSession) > 0 {
        deviceid.Ban(reqData.BaduserSession)
      }
      if reqData.BaduserId != 0 {
        //TODO: use username string
        deviceid.BanIdentity(strconv.FormatInt(reqData.BaduserId, 10))
      }
    }

    //TODO(al) communicate to the hub that a device must be kicked
    if !reqData.IsBanRevert{
      //TODO(al)
      //communicate to the hub that we want to kick a username and/or deviceID
    }

    {
      //basic audit log of the events
      event := "banned"
      if reqData.IsBanRevert {
        event = "reverted_ban"
      }
      logger.Printf("Moderation: (%s): %s on (%d, %s)",
        device.Id,
        event,
        reqData.BaduserId,
        reqData.BaduserSession,
        )
    }

    validation.RespondOk(w, "ok")
  }}
