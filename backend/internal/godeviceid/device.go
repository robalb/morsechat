package deviceid

import "net/http"

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
  // deviceId and all external data are not available, for
  // either a technical error or intentional malicious requests.
  Offline bool 
  // When offline, the ID is a combination of ipv4 and httpfinger
  // When online, the ID is a lookup key for the external database, which
  // uniquely identifies the device behind the HTTP request
  Id string

  //----------
  //Local data
  //----------
  Ipv4 string
  HttpFinger string

  //-------------
  //External data
  //-------------
  IsBanned bool
  //a non-suspicious device, with a long history
  //of connections and no reported issues.
  IsOrganic bool
}

//TODO: make this an external struct that must be initialized
//at program startup, and passed to some http middleware
type deviceIDConfig struct {
  // the source for the client ip.
  // leave empty to read from http.Request.RemoteAddr
  IpHeaders string
}

var (
  globalConfig = deviceIDConfig{
      IpHeaders: "X-Forwarded-For",
  }
)


// Calculates the DeviceData of the device behind the given HTTP request
// TODO: make this read from some data that was injected
// in the context by a custom middleware
func New(r *http.Request) (err error, d DeviceData){
  d = DeviceData{
    Offline: true,
    Ipv4: getIp(r),
    HttpFinger: getHttpFinger(r),
  }
  //TODO: extract and verify deviceid signed cookie
  //      on fail, set offline and calculate custom id
  d.setOfflineID()
  return
}


func getIp(r *http.Request) string {
  if globalConfig.IpHeaders != "" {
    if header := r.Header.Get(globalConfig.IpHeaders); header != "" {
      return header
    }
  }
  return r.RemoteAddr
}


func getHttpFinger(r *http.Request) string {
  return ""
}


func (d *DeviceData) setOfflineID(){
  d.Id = "TODO"
}


