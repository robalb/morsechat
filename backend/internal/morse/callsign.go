package morse

import (
	"crypto/rand"
	"fmt"
	"unicode"
)

func GenerateAnonCallsign(country string) (callsign string, err error) {
	// Create a slice that holds 3 random bytes
	bytes := make([]byte, 3)
	_, err = rand.Read(bytes)
	if err != nil {
		return
	}
	callsign = fmt.Sprintf("%s%X", country, bytes)
	return
}

// receives a callsign, and parses it.
// If it's in a valid format, returns ok and the associated country code.
// Valid format: US12ABC
//
//	--        2-letter ISO 3166-1 alpha-2 country code
//	  --      2 numbers
//	     --   3 letters
func ParseCallsign(callsign string) (countryCode string, ok bool) {
	// Check if the callsign is the correct length
	if len(callsign) != 7 {
		return "", false
	}

	// Extract components of the callsign
	countryCode = callsign[:2]
	numbers := callsign[2:4]
	letters := callsign[4:]

	// Validate the country code
	validCountry := false
	for _, code := range country_codes {
		if code == countryCode {
			validCountry = true
			break
		}
	}
	if !validCountry {
		return "", false
	}

	// Validate the numbers
	for _, r := range numbers {
		if !unicode.IsDigit(r) {
			return "", false
		}
	}

	// Validate the letters
	for _, r := range letters {
		if !unicode.IsLetter(r) || !unicode.IsUpper(r) {
			return "", false
		}
	}

	return countryCode, true
}

// ISO 3166-1 alpha-2 country codes
var country_codes = []string{
	"AF", "AL", "DZ", "AD", "AO", "AI", "AQ", "AG", "SA", "AR", "AM", "AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BE", "BZ", "BJ", "BM", "BT", "BY", "MM", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI", "KH", "CM", "CA", "CV", "TD", "CL", "CN", "CY", "VA", "CO", "KM", "KP", "KR", "CI", "CR", "HR", "CU", "CW", "DK", "DM", "EC", "EG", "SV", "AE", "ER", "EE", "ET", "FJ", "PH", "FI", "FR", "GA", "GM", "GE", "GS", "DE", "GH", "JM", "JP", "GI", "DJ", "JO", "GR", "GD", "GL", "GP", "GU", "GT", "GG", "GN", "GW", "GQ", "GY", "GF", "HT", "HN", "HK", "IN", "ID", "IR", "IQ", "IE", "IS", "BV", "IM", "CX", "NF", "AX", "BQ", "KY", "CC", "CK", "FO", "FK", "HM", "MP", "MH", "UM", "PN", "SB", "VG", "VI", "IL", "IT", "JE", "KZ", "KE", "KG", "KI", "KW", "LA", "LS", "LV", "LB", "LR", "LY", "LI", "LT", "LU", "MO", "MK", "MG", "MW", "MY", "MV", "ML", "MT", "MA", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MN", "ME", "MS", "MZ", "NA", "NR", "NP", "NI", "NE", "NG", "NU", "NO", "NC", "NZ", "OM", "NL", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PF", "PL", "PR", "PT", "MC", "QA", "GB", "CD", "CZ", "CF", "CG", "DO", "RE", "RO", "RW", "RU", "EH", "KN", "LC", "SH", "VC", "BL", "MF", "PM", "WS", "AS", "SM", "ST", "SN", "RS", "SC", "SL", "SG", "SX", "SY", "SK", "SI", "SO", "ES", "LK", "US", "ZA", "SD", "SS", "SR", "SJ", "SE", "CH", "SZ", "TW", "TJ", "TZ", "TF", "IO", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UA", "UG", "HU", "UY", "UZ", "VU", "VE", "VN", "WF", "YE", "ZM", "ZW",
}
