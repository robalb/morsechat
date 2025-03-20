package deviceid

import (
	"net"
	"net/http"
	"strings"
)

// Get the string representation of the client IP, taken from
// either the request object remoteaddr or the ip proxy ipHeaders
// that have been specified in the configuration.
// if all fails, an empty string is returned
func getIp(r *http.Request, ipHeaders []string) string {
  if len(ipHeaders) > 0 {
    if ip := getIpFromHeaders(r, ipHeaders); ip != "" {
      return ip
    }
  }

  ip, _, err := net.SplitHostPort(r.RemoteAddr)
  if err != nil {
    return ""
  }
  return ip
}



func getIpFromHeaders(r *http.Request, headers []string) string {
	for _, header := range headers {
		if ip := r.Header.Get(header); ip != "" {
			ips := strings.Split(ip, ",")
			if ips[0] == "" || net.ParseIP(ips[0]) == nil {
				continue
			}
			return ips[0]
		}
	}
	return ""
}



