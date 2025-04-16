package deviceid

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode"
)

// Return the context-agnostic http fingerprint of the request, composed of:
// [http version, 2 digits. eg: 2.0 -> 20]
// [language header, shortened to first 4 chars. eg: EN-us -> enus]
// [number of preferred languages, 1 digit]
// ['w' if there are weights in the preferred languages]
// [num of headers, 2 digits, prefixed with 0 if necessary, taken from the allowlist]
// ['_']
// [shortened sha256 hash of headers in the allowed headers list]
// ['_']
// [shortened sha256 hash of useragent]
//
// example fingerprint:
// 20enus2w09_95eba2e5c719_0c0a14c3bb11
func getHttpFinger(r *http.Request) string {
	// List of allowed headers that are likely to stay the same
	// across HTTP methods and origins (low-entropy headers)
	// The order of these headers is important for the implementation.
	// The user agent header is calculated in a separate hash
	allowedHeaders := []string{
		"accept-language",
		"dnt",
		"connection",
		"save-data",
		"sec-ch-ua",
		"sec-ch-ua-mobile",
		"sec-ch-ua-platform",
	}
	// [http version, 2 digits. e.g., 2.0 -> 20]
	httpVersion := fmt.Sprintf("%d%d", r.ProtoMajor%10, r.ProtoMinor%10)

	// language header
	lang := "xxxx0n" //default language string
	if langHeader := r.Header.Get("Accept-Language"); len(langHeader) > 0 {
		// first 4 digits of the language
		lang = ""
		for _, char := range strings.ToLower(langHeader) {
			if len(lang) == 4 || char == ',' || char == ';' {
				break
			}
			if char == '-' {
				continue
			}
			if unicode.IsLetter(char) {
				lang += string(char)
			}
		}
		//pad with 'x' if lan is less than 4 characters
		for i := len(lang); i < 4; i++ {
			lang += "x"
		}

		//language count, 0-9
		langCount := 1 + strings.Count(langHeader, ",")
		if langCount > 9 {
			langCount = 9
		}
		lang += strconv.Itoa(langCount)
		// 'w' if there are weights, 'n' if there are not
		hasWeights := strings.Contains(langHeader, ";")
		if hasWeights {
			lang += "w"
		} else {
			lang += "n"
		}
	}

	// [num of headers (taken from the allowlist), 2 digits]
	count := 0
	headersForHash := ""
	for _, h := range allowedHeaders {
		if hContent := r.Header.Get(h); hContent != "" {
			count += 1
			headersForHash += hContent
		}
	}
	numHeaders := fmt.Sprintf("%02d", count)

	// [shortened sha256 hash of headers (excluding Cookie)]
	headersHash := "000000000000"
	if len(headersForHash) > 0 {
		headersSha := sha256.Sum256([]byte(headersForHash))
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
