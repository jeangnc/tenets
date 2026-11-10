package split

import (
	"strings"
	"unicode"
)

func Words(identifier string) []string {
	var words []string
	for part := range strings.SplitSeq(identifier, "_") {
		words = append(words, camel([]rune(part))...)
	}
	return words
}

func camel(runes []rune) []string {
	var words []string
	start := 0
	for i := 1; i < len(runes); i++ {
		if startsWord(runes, i) {
			words = append(words, string(runes[start:i]))
			start = i
		}
	}
	if start < len(runes) {
		words = append(words, string(runes[start:]))
	}
	return words
}

func startsWord(runes []rune, i int) bool {
	previous, current := runes[i-1], runes[i]
	if !unicode.IsUpper(current) {
		return false
	}
	if !unicode.IsUpper(previous) {
		return true
	}
	if i+1 >= len(runes) || !unicode.IsLower(runes[i+1]) {
		return false
	}
	return !isPluralAcronym(runes, i)
}

func isPluralAcronym(runes []rune, i int) bool {
	return runes[i+1] == 's' && (i+2 == len(runes) || !unicode.IsLower(runes[i+2]))
}
