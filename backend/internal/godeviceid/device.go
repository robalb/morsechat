package deviceid

import (
	"database/sql"
	"log"
	"net/http"
)

// DeviceData contains informations about the device behind an HTTP request.
//
// The main element is the Id, which uniquely identifies the device behind the
// current http request. All data, including the ID, is calculated client-side
// by a dedicated javascript SDK, and passed to the backend API endpoints via a
// Cookie. IF the cookie is not valid, the DeviceData will be calculated server
// side, or "offline", and will have limited informations. The ID will be solely
// based on the IP and http fingerprint of the HTTP request, and will not be
// fully unique
type DeviceData struct {
	// deviceId and all external data are not available, because of either a
	// technical error or a tampered request
	Offline bool
	// When offline, the ID is a combination of ipv4 and httpfinger
	// When online, the ID is a lookup key for the external database, which
	// uniquely identifies the device behind the HTTP request
	Id string
	// When offline, the clusterID is the IP
	// When online, the clusterID is a lookup key for the external database, which
	// uniquely identifies a cluster of devices.
	//
	// - if a device is not part of a bot network, the ClusterId will likely be unique
	// - if a deviceID is offline, it's more likely to be erroneously clustered with other
	//   devices, just becase they share an ip. Don't take important actions based on
	//   Offline DeviceData
	ClusterId string
	//a non-Bad device, with a long history
	//of connections and no reported issues.
	IsOrganic bool
	//a device that is bad beyound any doubt:
	// - banned
	// - bot
	// - request cookie was clearly tampered
	// - request cookie was missing (only if set in settings)
	// - vpn user (only if set in settings)
	IsBad bool

	//----------
	//Local data
	//----------
	Ipv4       string
	HttpFinger string

	//-------------
	//External data
	//-------------
	IsBanned bool
	IsBot    bool
	IsVPN    bool
	IsTor    bool

  config *Config
}

type Config struct {
	// the source for the client ip.
	// leave empty to read from http.Request.RemoteAddr
  ipHeaders []string
  vPNIsBad bool
  torIsBad bool
  offlineIsBad bool

	logger *log.Logger
	dbReadPool *sql.DB
	dbWritePool *sql.DB
}

func  NewConfig(
	logger *log.Logger,
	dbReadPool *sql.DB,
	dbWritePool *sql.DB,
  ipHeaders []string,
) *Config{
  return &Config{ 
    ipHeaders: ipHeaders,
		vPNIsBad:  true,
		torIsBad:  true,
		offlineIsBad: false,

    logger: logger,
    dbReadPool: dbReadPool,
    dbWritePool: dbWritePool,
  }
}

// Calculates the DeviceData of the device behind the given HTTP request
func New(config *Config, r *http.Request) (d DeviceData, err error) {
	d = DeviceData{
		Offline:    true,
		IsOrganic:  false,
		IsBad:      false,
		IsBanned:   false,
		IsBot:      false,
		IsVPN:      false,
		IsTor:      false,
		Ipv4:       getIp(r, config.ipHeaders),
		HttpFinger: getHttpFinger(r),
    config:     config,
	}
	if !isPublicIP(d.Ipv4) {
		config.logger.Printf("DeviceID warning: private IP. Are you behind a proxy?")
	}

	//TODO: extract and verify deviceid signed cookie
	//      on fail, set offline and calculate custom id
	if "offline" == "offline" {
		d.Id = getOfflineID(&d)
		d.ClusterId = d.Ipv4
		//all this is temporary
		d.IsBad = tempIsBad(d.Id) || tempIsBanned(d.Ipv4, config)
	}
	return
}

//--------------------
// Unstable APIs, in use
//--------------------

// associate an unique Identity to a device.
// this is considered new, trusted information about
// the device. it will be used to recalculate the clusters.
//
// This information is anonymized before being sent to the
// deviceID servers.
func (d *DeviceData) SetUniqueIdentity(id string) {
  //instead of considering a device, we are temporarily
  //associating an identity to an IP, stored locally
	tempAssociate(id, d.Ipv4, d.config)
}

// ban a cluster associated to the device, with no
// additional metadata.
// if the cluster was already banned, this is a no-op,
// and previous ban metadata will remain valid
//
// return the deviceId, which can be stored
// to keep track of bans, and be used to undo a ban.
// when offline, the ban is a simple ipban
func (d *DeviceData) SetBanned() string {
	d.IsBanned = true
	d.IsBad = true
	tempBan(d.Ipv4, d.config)
	return d.Id
}

// same as SetBanned, but works with a deviceID string,
// even if there is no current reference to the device object.
func (config *Config) Ban(deviceId string) string {
	ip, isOfflineId := extractIP(deviceId)
	if isOfflineId {
    tempBan(ip, config)
	}
	return deviceId
}

// undo the ban associated to a device ID
// when offline, the banID is the IP
func (config *Config) UndoBan(bannedDeviceId string) {
	ip, isOfflineId := extractIP(bannedDeviceId)
	if isOfflineId {
		tempUnban(ip, config)
	}
}

// ban a unique identity.
func (config *Config) BanIdentity(identity string) {
	tempBanIdentity(identity, config)
}

//	undo ban on a unique identity.
func (config *Config) UndoBanIdentity(identity string) {
	tempUnbanIdentity(identity, config)
}

//--------------------
// Unstable APIs, testing ground, not in use
//--------------------

// Accepts a list of deviceIDs, returns all deviceIDs
// in the list that are in the same cluster of the current device
func (config *Config) FilterAssociatedIDs(ids []string) []string {
	return []string{}
}
