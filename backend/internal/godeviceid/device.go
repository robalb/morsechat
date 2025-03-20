package deviceid

import (
	"fmt"
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
  Ipv4 string
  HttpFinger string

  //-------------
  //External data
  //-------------
  IsBanned bool
  IsBot bool
  IsVPN bool
  IsTor bool
}

//TODO: make this an external struct that must be initialized
//at program startup, and passed to some http middleware
type deviceIDConfig struct {
  // the source for the client ip.
  // leave empty to read from http.Request.RemoteAddr
  IpHeaders []string
  VPNIsBad bool
  TorIsBad bool
  OfflineIsBad bool
}

var (
  globalConfig = deviceIDConfig{
    IpHeaders: []string {"X-Forwarded-For"},
    VPNIsBad: true,
    TorIsBad: true,
    //TODO: set this via app config (env, flags, ...)
    OfflineIsBad: false,
  }
)


// Calculates the DeviceData of the device behind the given HTTP request
// TODO: make this read from some data that was injected
// in the context by a custom middleware
func New(r *http.Request) (d DeviceData, err error){
  d = DeviceData{
    Offline: true,
    IsOrganic: false,
    IsBad: false,
    IsBanned: false,
    IsBot: false,
    IsVPN: false,
    IsTor: false,
    Ipv4: getIp(r, globalConfig.IpHeaders),
    HttpFinger: getHttpFinger(r),
  }
  if !isPublicIP(d.Ipv4) {
    //TODO: add logger dependency
    //TODO: warning, fingerprinting a private ip address.
    //      are you behind a reverse proxy?
    fmt.Println("DeviceID warning: private IP. Are you behind a proxy?")
  }

  //TODO: extract and verify deviceid signed cookie
  //      on fail, set offline and calculate custom id
  if "offline" == "offline"{
    d.Id = getOfflineID(&d)
    d.ClusterId = d.Ipv4
    //all this is temporary
    d.IsBad = tempIsBad(d.Id)
  }
  
  //TODO: metrics.
  //offline, isOrganic, IsBad(reason)
  return
}

//--------------------
// Unstable APIs, testing ground
//--------------------

//if you need more than a single info, use the constructor
func IsOrganic(r *http.Request) bool{
  d, err := New(r)
  if err != nil {
    return false
  }
  return d.IsOrganic
}

//if you need more than a single info, use the constructor
func IsBad(r *http.Request) (bool, error){
  d, err := New(r)
  if err != nil {
    return false, err
  }
  return d.IsBad, nil
}


// Accepts a list of deviceIDs, returns all deviceIDs 
// in the list that are in the same cluster of the current device
func (d *DeviceData) FilterAssociatedIDs(ids []string) []string{
  return FilterAssociatedIDs(d.Id, ids)
}

// Accepts a list of deviceIDs, returns all deviceIDs 
// in the list that are in the same cluster of the deviceID
func FilterAssociatedIDs(id string, ids []string) []string{
  return []string{}
  //TODO
}


//refresh stale deviceID data
func (d *DeviceData) Refresh(){
  //all this is temporary
  d.IsBad = tempIsBad(d.Id)
}

