package handlers

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSettingsAutoDetectWpmJSON(t *testing.T) {
	var settings Settings
	if err := json.Unmarshal([]byte(`{"auto_detect_wpm":true}`), &settings); err != nil {
		t.Fatalf("could not decode settings: %v", err)
	}
	if !settings.AutoDetectWPM {
		t.Fatal("expected auto_detect_wpm to be true")
	}

	encoded, err := json.Marshal(settings)
	if err != nil {
		t.Fatalf("could not encode settings: %v", err)
	}
	if !strings.Contains(string(encoded), `"auto_detect_wpm":true`) {
		t.Fatalf("encoded settings do not contain auto_detect_wpm: %s", encoded)
	}
}

func TestSettingsAutoDetectWpmDefaultsToFalse(t *testing.T) {
	// Settings saved before the option existed must keep working and default
	// to the previous behaviour (auto-detection disabled).
	var settings Settings
	if err := json.Unmarshal([]byte(`{"wpm":12}`), &settings); err != nil {
		t.Fatalf("could not decode settings: %v", err)
	}
	if settings.AutoDetectWPM {
		t.Fatal("expected auto_detect_wpm to default to false")
	}
}
