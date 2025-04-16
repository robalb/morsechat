package morse

import (
	"net/http"
	"sort"
	"strconv"
	"strings"
)

func GetVisitorCountry(r *http.Request) (country string) {
	//default country
	country = "US"
	// Extract the Accept-Language header.
	acceptLanguage := r.Header.Get("Accept-Language")
	if acceptLanguage == "" {
		return
	}
	// When possible, match the declared languages to a country
	parsedList := parseAcceptLanguage(acceptLanguage)
	return negotiateCountryFromLanguages(parsedList)
}

func parseAcceptLanguage(acceptLanguage string) (localeQPairs []struct {
	Locale string
	Weight float64
}) {
	if len(acceptLanguage) < 2 {
		return
	}
	languages := strings.Split(acceptLanguage, ",")
	for _, language := range languages {
		parts := strings.Split(language, ";")
		locale := strings.TrimSpace(parts[0])
		weight := 1.0 // Default weight
		if len(parts) > 1 {
			qParts := strings.Split(parts[1], "=")
			if len(qParts) == 2 {
				if qValue, err := strconv.ParseFloat(strings.TrimSpace(qParts[1]), 64); err == nil {
					weight = qValue
				}
			}
		}
		localeQPairs = append(localeQPairs, struct {
			Locale string
			Weight float64
		}{locale, weight})
	}
	return
}

func negotiateCountryFromLanguages(parsedList []struct {
	Locale string
	Weight float64
}) string {
	defaultCountry := "US"

	// Normalize country codes to a map for quick lookup
	normalizedCodes := make(map[string]bool, len(country_codes))
	for _, code := range country_codes {
		normalizedCodes[strings.ToUpper(code)] = true
	}

	// Sort parsedList by weight in descending order
	sort.Slice(parsedList, func(i, j int) bool {
		return parsedList[i].Weight > parsedList[j].Weight
	})

	for _, item := range parsedList {
		locale := item.Locale
		if len(locale) > 3 && locale[2] == '-' {
			// Check for format xx-YY
			countryCode := strings.ToUpper(locale[3:])
			if normalizedCodes[countryCode] {
				return countryCode
			}
		} else if len(locale) == 2 {
			// Check for format xx
			countryCode := strings.ToUpper(locale)
			if normalizedCodes[countryCode] {
				defaultCountry = countryCode
			}
		}
	}

	return defaultCountry
}
