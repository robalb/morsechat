// These types define the whole websocket API interface
package wsserver

//------------------------
//user commands
//------------------------

// {type: "join", body: CommandJoinRoom}
type CommandJoinRoom struct {
	Name string `json:"name"`
}

// {type: "typing", body: CommandTying}
type CommandTying struct {
	Typing bool `json:"typing"`
}

// {type: "message", body: CommandMorse}
type CommandMorse struct {
	Dialect string `json:"dialect"`
	Wpm     int    `json:"wpm"`
	Message []int  `json:"message"`
}

//------------------------
// Broadcast messages
//------------------------

type WsUser struct {
	IsAnonymous bool   `json:"is_anonymous"`
	Callsign    string `json:"callsign"`
	Username    string `json:"username"`
	IsTyping    bool   `json:"is_typing"`
}

// {type="join" ...}
type MessageJoin struct {
	Type    string   `json:"type"`
	Channel string   `json:"channel"`
	Users   []WsUser `json:"users"`
	Newuser WsUser   `json:"newuser"`
}

// {type="leave" ...}
type MessageLeave struct {
	Type    string   `json:"type"`
	Channel string   `json:"channel"`
	Users   []WsUser `json:"users"`
	Left    WsUser   `json:"left"`
}

// {type="joinerror" ...}
type MessageJoinError struct {
	Type            string `json:"type"`
	RejectedChannel string `json:"rejected_channel"`
	Error           string `json:"error"`
}

// {type="typing" ...}
type MessageTyping struct {
	Type     string `json:"type"`
	Typing   bool   `json:"typing"`
	Callsign string `json:"callsign"`
}

// {type="message" ...}
type MessageMorse struct {
	Type      string `json:"type"`
	Callsign  string `json:"callsign"`
	Dialect   string `json:"dialect"`
	Wpm       int    `json:"wpm"`
	Message   []int  `json:"message"`
	Signature string `json:"signature"`
}

// {type="messagestatus" }
type MessageMorseStatus struct {
	Type    string `json:"type"`
	Ok      bool   `json:"ok"`
	Error   string `json:"error"`
	Details string `json:"details"`
}
