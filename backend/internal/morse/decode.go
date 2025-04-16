package morse

import (
	"strings"
)

// Morse code mapping
var morseCodeMap = map[string]string{
	".-":     "a",
	"-...":   "b",
	"-.-.":   "c",
	"-..":    "d",
	".":      "e",
	"..-.":   "f",
	"--.":    "g",
	"....":   "h",
	"..":     "i",
	".---":   "j",
	"-.-":    "k",
	".-..":   "l",
	"--":     "m",
	"-.":     "n",
	"---":    "o",
	".--.":   "p",
	"--.-":   "q",
	".-.":    "r",
	"...":    "s",
	"-":      "t",
	"..-":    "u",
	"...-":   "v",
	".--":    "w",
	"-..-":   "x",
	"-.--":   "y",
	"--..":   "z",
	".-.-.-": ".",
	"--..--": ",",
	"..--..": "?",
	".----.": "'",
	".-..-.": "\"",
	"-.-.--": "!",
	"-..-.":  "/",
	"---...": ":",
	"-.-.-.": ";",
	"-.--.":  "(",
	"-.--.-": ")",
	"-...-":  "=",
	"-....-": "-",
	"..--.-": "_",
	".-.-.":  "+",
	".--.-.": "@",
	".----":  "1",
	"..---":  "2",
	"...--":  "3",
	"....-":  "4",
	".....":  "5",
	"-....":  "6",
	"--...":  "7",
	"---..":  "8",
	"----.":  "9",
	"-----":  "0",
}

// Translate decodes Morse code timings into text
func Translate(keyTimes []int, wpm int) (decodedMessage string, timeLength int, malformed bool) {
	// Calculate timing thresholds
	unit := 1200 / wpm        // Length of a dot in milliseconds
	shortSilence := unit      // Inter-element space
	mediumSilence := 3 * unit // Inter-letter space
	longSilence := 7 * unit   // Inter-word space

	//the max duration (in milliseconds) of a message, after which it gets truncated
	//an estimate of message length is this:
	//  ----------- ----------- ----------- ----------- 10s segments
	// "the quick brown fox jumps over the lazy dog"    40s
	maxTime := 60 * 1000
	//

	var decoded strings.Builder
	var currentSymbol strings.Builder

	for i, time := range keyTimes {
		if time <= 0 || time > 6000 {
			//The message is malformed, no reason to keep parsing
			return "", timeLength, true
		}
		timeLength += time
		if i%2 == 0 { // Sound segment
			if timeLength > maxTime {
				break
			}
			if time < unit*3 {
				currentSymbol.WriteByte('.')
			} else {
				currentSymbol.WriteByte('-')
			}
		} else { // Silence segment
			switch {
			case time >= longSilence:
				decoded.WriteString(morseCodeMap[currentSymbol.String()])
				decoded.WriteByte(' ')
				currentSymbol.Reset()
			case time >= mediumSilence:
				decoded.WriteString(morseCodeMap[currentSymbol.String()])
				currentSymbol.Reset()
			case time >= shortSilence:
				// Inter-element space, do nothing
			}
		}
	}

	// Decode remaining symbol
	if currentSymbol.Len() > 0 {
		decoded.WriteString(morseCodeMap[currentSymbol.String()])
	}

	return decoded.String(), timeLength, false
}
