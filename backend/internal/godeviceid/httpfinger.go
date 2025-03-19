package deviceid

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// Return the context-agnostic http fingerprint of the request, composed of:
// [http version, 2 digits. eg: 2.0 -> 20]
// [language header, shortened to first 4 chars. eg: EN-us -> enus]
// [number of preferred languages, 1 digit]
// ['w' if there are weights in the preferred languages]
// [num of headers, 2 digits, prefixed with 0 if necessary, taken from the whitelist]
// ['_']
// [shortened sha256 hash of headers, cookie header excluded]
// ['_']
// [shortened sha256 hash of useragent]
//
// example fingerprint:
// 20enus2w09_95eba2e5c719_0c0a14c3bb11
func getHttpFinger(r *http.Request) string {
	// [http version, 2 digits. e.g., 2.0 -> 20]
  httpVersion := fmt.Sprintf("%d%d", r.ProtoMajor, r.ProtoMinor)

	// language header
	lang := "xxxx0n" //default language string
  if langHeader := r.Header.Get("Accept-Language"); len(langHeader) > 0{
    // first 4 digits of the language
    lang = strings.ToLower(strings.ReplaceAll(langHeader, "-", ""))
    if len(lang) >= 4 {
      lang = lang[:4]
    } else {
      lang = fmt.Sprintf("%-4s", lang)   // pad with spaces first
      lang = strings.ReplaceAll(lang, " ", "x") // replace spaces with 'x'
    }
    //language count, 0-9
    langCount := 1 + strings.Count(langHeader, ",")
    if langCount > 9{
      langCount = 9
    }
    lang += strconv.Itoa(langCount)
    // 'w' if there are weights, 'n' if there are not
    hasWeights := strings.Contains(langHeader, ";")
    if hasWeights {
      lang += "w"
    }else {
      lang += "n"
    }
	}

	// [num of headers (taken from the allowlist), 2 digits]
	count := 0
	var headersForHash []string
	for k, v := range r.Header {
    keyLower := strings.ToLower(k)
    // only count headers that are likely to stay the same
    // across HTTP method and origin
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Client_hints#low_entropy_hints
    if keyLower == "user-agent" || 
       keyLower == "accept-language" || 
       keyLower == "connection" || 
       keyLower == "dnt" || 
       keyLower == "save-data" || 
       keyLower == "sec-ch-ua" || 
       keyLower == "sec-ch-ua-mobile" || 
       keyLower == "sec-ch-ua-platform" {
      count++
      headersForHash = append(headersForHash, fmt.Sprintf("%s: %s", k, strings.Join(v, ",")))
    }
	}
	numHeaders := fmt.Sprintf("%02d", count)

	// [shortened sha256 hash of headers (excluding Cookie)]
	headersHash := "000000000000"
	if len(headersForHash) > 0 {
		headersSha := sha256.Sum256([]byte(strings.Join(headersForHash, "\n")))
		headersHash = hex.EncodeToString(headersSha[:])[:12]
	}

	// [shortened sha256 hash of user agent]
	userAgent := r.UserAgent()
	uaHash := "000000000000"
	if userAgent != "" {
		uaSha := sha256.Sum256([]byte(userAgent))
		uaHash = hex.EncodeToString(uaSha[:])[:12]
	}

	// Assemble the fingerprint
	return fmt.Sprintf("%s%s%s_%s_%s", httpVersion, lang, numHeaders, headersHash, uaHash)
}


