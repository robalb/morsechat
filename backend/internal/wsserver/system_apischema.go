// These types define the internal system messaging interface,
// that allow the system to interact with the Hub.
package wsserver

func (m SysMessageKick) isSystemMessage() {}

type SysMessageKick struct {
	Username string
	Device   string
}

func (m SysMessageMute) isSystemMessage() {}

type SysMessageMute struct {
	Callsign string
	Mute     bool
}

func (m SysMessageBroadcast) isSystemMessage() {}

type SysMessageBroadcast struct {
	message []byte
	channel string
}
