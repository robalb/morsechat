//Common types that define the api schema

package handlers

type Keybinds struct {
    Straight       string `json:"straight" validate:"required,min=1,max=2"`
    YambicLeft     string `json:"yambic_left" validate:"required,min=1,max=2"`
    YambicRight    string `json:"yambic_right" validate:"required,min=1,max=2"`
    CancelMessage  string `json:"cancel_message" validate:"required,min=1,max=2"`
}
type Settings struct {
    Dialect        string   `json:"dialect" validate:"required,min=1,max=20"`
    KeyMode        string   `json:"key_mode" validate:"required,min=1,max=20"`
    WPM            int      `json:"wpm" validate:"required,gte=5,lte=50"`
    VolumeReceiver int      `json:"volume_receiver" validate:"required,gte=0,lte=100"`
    VolumeKey      int      `json:"volume_key" validate:"required,gte=0,lte=100"`
    SubmitDelay    int      `json:"submit_delay" validate:"required,gte=5,lte=50"`
    ShowReadable   bool     `json:"show_readable"`
    LeftIsDot      bool     `json:"left_is_dot" validate:"required"`
    Keybinds       Keybinds `json:"keybinds" validate:"required"`
}

// response object used by both login, register, and sess_init
type AuthResponse struct {
	IsAnonymous bool   `json:"is_anonymous"`
	IsAdmin     bool   `json:"is_admin"`
	IsModerator bool   `json:"is_moderator"`
	Username    string `json:"username"`
	Callsign    string `json:"callsign"`
	Country     string `json:"country"`
  Settings    *Settings `json:"settings"`
}

type OkResponse struct {
  Ok string `json:"ok"`
}

type ModerationUserResponse struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	Callsign    string `json:"callsign"`
	Country     any    `json:"country"`
	IsVerified  bool   `json:"is_verified"`
	IsModerator bool   `json:"is_moderator"`
}

type ModerationAnonUserResponse struct {
	ID          int64  `json:"id"`
	LastSession string `json:"last_session"`
}

type ModerationBanActionResponse struct {
	ID             int64  `json:"id"`
	ModeratorID    int64  `json:"moderator_id"`
	EventTimestamp int64  `json:"event_timestamp"`
	BaduserID      int64  `json:"baduser_id"`
	BaduserSession string `json:"baduser_session"`
	ModeratorNotes any    `json:"moderator_notes"`
	Reason         any    `json:"reason"`
	IsBanRevert    bool   `json:"is_ban_revert"`
}

type ModerationReportActionResponse struct {
	ID                   int64  `json:"id"`
	ReporterUserID       int64  `json:"reporter_user_id"`
	ReporterUsername     string `json:"reporter_username"`
	ReporterSession      string `json:"reporter_session"`
	EventTimestamp       int64  `json:"event_timestamp"`
	BaduserID            int64  `json:"baduser_id"`
	BaduserUsername      string `json:"baduser_username"`
	BaduserSession       string `json:"baduser_session"`
	Reason               any    `json:"reason"`
	BadmessageTranscript string `json:"badmessage_transcript"`
	BadmessageTimestamp  int64  `json:"badmessage_timestamp"`
}

type ModerationListResponse struct {
	Users      []ModerationUserResponse          `json:"users"`
	BanActions []ModerationBanActionResponse     `json:"ban_actions"`
	Reports    []ModerationReportActionResponse  `json:"report_actions"`
	AnonUsers  []ModerationAnonUserResponse      `json:"anon_users"`
}


