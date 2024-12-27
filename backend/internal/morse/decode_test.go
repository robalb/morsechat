package morse

import (
	"testing"
)


// Unit tests
func TestTranslate(t *testing.T) {
	tests := []struct {
		name     string
		keyTimes []int
		wpm      int
		expected string
	}{
		{
			name:     "e Morse Test",
			keyTimes: []int{72},
			wpm:      12,
			expected: "e",
		},
		{
			name:     "t Morse Test",
			keyTimes: []int{534},
			wpm:      12,
			expected: "t",
		},
		{
			name:     "SOS Morse Test",
			keyTimes: []int{46,105,42,88,39,502,429,115,446,103,406,540,54,97,30,110,23},
			wpm:      17,
			expected: "s o s",
		},
		{
			name:     "The quick brown fox Morse Test",
			keyTimes: []int{ 280,403,49,101,53,97,44,86,62,406,59,949,229,114,237,95,47,105,370,414,59,92,65,85,394,391,63,73,62,420,273,90,38,113,285,79,53,415,262,102,30,121,414,803,230,94,46,100,46,85,54,413,62,93,261,86,46,449,342,121,309,102,357,295,55,88,317,99,345,404,317,102,53,792,62,99,47,111,332,93,46,488,368,154,291,105,356,341,245,112,39,110,39,98,453,},
			wpm:      16,
			expected: "the quick brown fox",
		},
		{
			name:     "Invalid letter",
			keyTimes: []int{ 72,580,47,104,46,104,49,90,52,94,54,103,62,105,46,98,62,83,60 },
			wpm:      16,
			expected: "e ",
		},
		{
			name:     "No data",
			keyTimes: []int{},
			wpm:      16,
			expected: "",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result, _, _ := Translate(test.keyTimes, test.wpm)
			if result != test.expected {
				t.Errorf("expected %q, got %q", test.expected, result)
			}
		})
	}
}

