package morse

import (
	"testing"
)

// Unit Tests
func TestParseAndNegotiate(t *testing.T) {
	tests := []struct {
		name           string
		acceptLanguage string
		expectedCountry string
	}{
		{
			name:           "Single language with region",
			acceptLanguage: "en-US",
			expectedCountry: "US",
		},
		{
			name:           "Multiple languages with weights",
			acceptLanguage: "fr-FR;q=0.9,en-US;q=0.8,es-ES;q=0.7",
			expectedCountry: "FR",
		},
		{
			name:           "Multiple languages with unordered weights",
			acceptLanguage: "fr-FR;q=0.2,en-US;q=0.5,es-ES;q=0.7",
			expectedCountry: "ES",
		},
		{
			name:           "No weights specified",
			acceptLanguage: "es-MX,en-US",
			expectedCountry: "MX",
		},
		{
			name:           "Malformed header",
			acceptLanguage: "en;q=notanumber,fr;q=0.5",
			expectedCountry: "FR",
		},
		{
			name:           "Empty Accept-Language",
			acceptLanguage: "",
			expectedCountry: "US",
		},
		{
			name:           "Evil Accept-Language",
			acceptLanguage: ";;;;;=;;;==;;;;' \"",
			expectedCountry: "US",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			parsedList := parseAcceptLanguage(test.acceptLanguage)
			result := negotiateCountryFromLanguages(parsedList)
			if result != test.expectedCountry {
				t.Errorf("expected %s, got %s", test.expectedCountry, result)
			}
		})
	}
}

