package split

import (
	"slices"
	"testing"
)

func TestWords_SplitsIdentifiersAtWordBoundaries(t *testing.T) {
	cases := map[string][]string{
		"balance":                  {"balance"},
		"accountBalance":           {"account", "Balance"},
		"AccountBalance":           {"Account", "Balance"},
		"writeJSON":                {"write", "JSON"},
		"HTTPStatus":               {"HTTP", "Status"},
		"CCBillAccountID":          {"CC", "Bill", "Account", "ID"},
		"ListIDsByPayee":           {"List", "IDs", "By", "Payee"},
		"addedIDs":                 {"added", "IDs"},
		"base64Encode":             {"base64", "Encode"},
		"snake_case_name":          {"snake", "case", "name"},
		"_hidden":                  {"hidden"},
		"ID":                       {"ID"},
		"ScheduleOccurrenceRowsBy": {"Schedule", "Occurrence", "Rows", "By"},
	}
	for name, want := range cases {
		if got := Words(name); !slices.Equal(got, want) {
			t.Errorf("Words(%q) = %q, want %q", name, got, want)
		}
	}
}
