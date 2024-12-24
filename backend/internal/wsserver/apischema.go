package wsserver

//------------------------
//user commands
//------------------------

// {type: "join", body: CommandJoinRoom}
type CommandJoinRoom struct{
  Name string `json:"name"`
}
// {type: "typing", body: CommandTying}
type CommandTying struct{
  Typing bool `json:"typing"`
}
// {type: "message", body: CommandMorse}
type CommandMorse struct{
  Dialect string `json:"dialect"`
  Wpm int `json:"wpm"`
  Message []int `json:"message"`
}


//------------------------
// Broadcast messages
//------------------------

type MessageUser struct{
  IsAnonymous bool `json:"is_anonymous"`
  Callsign string  `json:"callsign"`
  Username string  `json:"username"`
}
type MessageJoin struct{
  Channel string      `json:"channel"`
  Users []MessageUser `json:"users"`
  Newuser MessageUser  `json:"newuser"`
}

type MessageLeave struct{
  Channel string      `json:"channel"`
  Users []MessageUser `json:"users"`
  Left MessageUser  `json:"left"`
}

type MessageTyping struct{
  Typing bool `json:"typing"`
  Callsign string `json:"callsign"`
}

type MessageMorse struct{
  Callsign string `json:"callsign"`
  Dialect string `json:"dialect"`
  Wpm int `json:"wpm"`
  Message []int `json:"message"`
}
