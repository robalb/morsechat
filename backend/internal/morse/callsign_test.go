package morse

import (
	"testing"
)

func TestParseCallsign(t *testing.T) {
	tests := []struct {
		name         string
		callsign     string
		expectedCode string
		expectedOK   bool
	}{
		// Valid cases
		{"Valid US callsign", "US12ABC", "US", true},
		{"Valid CA callsign", "CA99XYZ", "CA", true},
		{"Valid GB callsign", "GB01DEF", "GB", true},

		// Invalid cases
		{"Invalid length - too short", "US12AB", "", false},
		{"Invalid length - too long", "US1234ABC", "", false},
		{"Invalid country code", "ZZ12ABC", "", false},
		{"Invalid numbers", "US1AABC", "", false},
		{"Invalid letters - lowercase", "US12abc", "", false},
		{"Invalid letters - special characters", "US12A@#", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotCode, gotOK := ParseCallsign(tt.callsign)
			if gotCode != tt.expectedCode || gotOK != tt.expectedOK {
				t.Errorf("parseCallsign(%q) = (%q, %v), want (%q, %v)",
					tt.callsign, gotCode, gotOK, tt.expectedCode, tt.expectedOK)
			}
		})
	}
}
