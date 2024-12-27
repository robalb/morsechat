package morse

import (
	"testing"
)

func TestContainsHateSpeech(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"normal text with no bad words or spam", false},
		{"e e eee t h sos", false},
		{"sos", false},
		{"e", false},
		{"t", false},
		{"hi hello h i goodbye goodbie", false},
		{"where are u from? i'm from italy", false},
		{"shllo w rld ", false},
		{"the quick brown fox j mh w rld ", false},
		{"completely innocent text", false},
		{"just some random gibberish", false},
    {"e http://some.website.com some random gibberish", false},
    {"e 127.21.43.21 some random gibberish", false},

    {"for testing purposes, we filter the made up word: tolmaco", true},
		{"text containing tolmaco", true},
		{"text containing t0!m4c0", true},
		{"to lma co spacing ", true},
		{"t 0 l m 4 c o spacing ", true},
		{"!!!t.0.l.m.@.c.o spacing ", true},
	}

	for _, test := range tests {
		result := ContainsBadLanguage(test.input)
		if result != test.expected {
			t.Errorf("For input '%s', expected %v but got %v", test.input, test.expected, result)
		}
	}
}

