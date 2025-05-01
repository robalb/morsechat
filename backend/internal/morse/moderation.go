package morse

import (
	_ "embed"
	"regexp"
	"strings"
)

// https://github.com/zacanger/profane-words/blob/master/words.json
//
//go:embed moderation_badwords.txt
var badwordsListEncoded string

func badwordsListDecode(input string) []string {
	runes := []rune(input)
	for i, r := range runes {
		switch {
		case r >= 'a' && r <= 'z':
			runes[i] = 'a' + (r-'a'+13)%26
		case r >= 'A' && r <= 'Z':
			runes[i] = 'A' + (r-'A'+13)%26
		}
	}
	return strings.Split(string(runes), "\n")
}

// Replace characters in a string based on defined rules
func normalize(input string) string {
	replacements := map[rune]rune{
		'4': 'a', '@': 'a',
		'3': 'e',
		'l': 'i', '1': 'i', '!': 'i', '/': 'i', '\\': 'i', '|': 'i',
		'0': 'o',
		'7': 't',
		'5': 's', '$': 's',
		'9': 'g',
		'6': 'b',
		'2': 'z',
	}

	runes := []rune(input)
	for i, r := range runes {
		if replacement, exists := replacements[r]; exists {
			runes[i] = replacement
		}
	}
  return string(runes)
}


func truncate(input string, length int) string {
	runes := []rune(input)
	var result []rune
  lastRune := '.'
	count := 0

	for _, r := range runes {
		if r == lastRune {
			count++
		} else {
			count = 1
			lastRune = r
		}
		if count <= length {
			result = append(result, r)
		}
	} 
	return string(result)
}


// return true if the input string contains spam or inappropirate language
func ContainsBadLanguage(input string) bool {
	if len(input) < 3 {
		return false
	}
	// Replacement regex to normalize the input
	replacementPattern := regexp.MustCompile(`[ .\-_]+`)
	input = replacementPattern.ReplaceAllString(input, "")
	input = normalize(input)

	// remove false positives
	for _, goodWord := range falsePositiveWordsList {
		normalized := normalize(goodWord)
		input = strings.ReplaceAll(input, normalized, " ")
	}

  input = truncate(input, 1)
	badList := badwordsListDecode(badwordsListEncoded)
	for _, badWord := range badList {
		normalized := truncate(normalize(badWord), 1)
		if len(normalized) > 1 && strings.Contains(input, normalized) {
			return true
		}
	}
	return false
}
