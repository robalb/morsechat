package handlers

import "github.com/robalb/morsechat/internal/db"

func adaptUsers(dbUsers []db.User) []ModerationUserResponse {
	users := make([]ModerationUserResponse, 0, len(dbUsers))
	for _, u := range dbUsers {
		users = append(users, ModerationUserResponse{
			ID:          u.ID,
			Username:    u.Username,
			Callsign:    u.Callsign,
			Country:     u.Country,
			IsVerified:  u.IsVerified == 1,
			IsModerator: u.IsModerator == 1,
		})
	}
	return users
}

func adaptAnonUsers(dbAnon []db.AnonUser) []ModerationAnonUserResponse {
	users := make([]ModerationAnonUserResponse, 0, len(dbAnon))
	for _, a := range dbAnon {
		users = append(users, ModerationAnonUserResponse{
			ID:          a.ID,
			LastSession: a.LastSession,
		})
	}
	return users
}

func adaptBanActions(bans []db.BanAction) []ModerationBanActionResponse {
	actions := make([]ModerationBanActionResponse, 0, len(bans))
	for _, b := range bans {
		action := ModerationBanActionResponse{
			ID:             b.ID,
			ModeratorID:    b.ModeratorID,
			EventTimestamp: b.EventTimestamp,
			BaduserSession: b.BaduserSession,
			ModeratorNotes: b.ModeratorNotes,
			Reason:         b.Reason,
			IsBanRevert:    b.IsBanRevert == 1,
		}
		if b.BaduserID.Valid {
			action.BaduserID = b.BaduserID.Int64
		}
		actions = append(actions, action)
	}
	return actions
}

func adaptReportActions(reports []db.ReportAction) []ModerationReportActionResponse {
	actions := make([]ModerationReportActionResponse, 0, len(reports))
	for _, r := range reports {
		action := ModerationReportActionResponse{
			ID:                   r.ID,
			ReporterSession:      r.ReporterSession,
      ReporterUsername:     r.ReporterUsername,
			EventTimestamp:       r.EventTimestamp,
			BaduserSession:       r.BaduserSession,
      BaduserUsername:      r.BaduserUsername,
			Reason:               r.Reason,
			BadmessageTranscript: r.BadmessageTranscript,
			BadmessageTimestamp:  r.BadmessageTimestamp,
		}
		if r.ReporterUserID.Valid {
			action.ReporterUserID = r.ReporterUserID.Int64
		}
		if r.BaduserID.Valid {
			action.BaduserID = r.BaduserID.Int64
		}
		actions = append(actions, action)
	}
	return actions
}

