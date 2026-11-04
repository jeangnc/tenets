package app

import (
	"net/http"
	"strings"

	"example.com/app/gen"
	"example.com/app/model"
	"example.com/app/vendorapi"
	"example.com/app/view"
	"example.com/app/wire"
	"example.com/other"
)

type Summary struct {
	Balance int
}

func (s Summary) Positive() bool {
	return s.Balance > 0
}

func summaryOf(account model.Account) Summary {
	return Summary{Balance: account.Balance}
}

func balanceOfAccount(account model.Account) int { // want "balanceOfAccount reads model.Account and no other type it could own; make it a method of model.Account"
	return account.Balance
}

func balanceOf(summary Summary) int { // want "balanceOf reads Summary"
	return summary.Balance
}

func summaryBalance(summary Summary) int { // want "summaryBalance reads Summary"
	return summary.Balance
}

func positive(summary Summary) bool { // want "positive reads Summary"
	return summary.Positive()
}

func total(summaries []Summary) int {
	sum := 0
	for _, summary := range summaries {
		sum += summary.Balance
	}
	return sum
}

func first(summaries []Summary) int {
	return summaries[0].Balance
}

func writeBalance(w http.ResponseWriter, summary Summary) { // want "writeBalance reads Summary"
	w.Header().Set("Balance", string(rune(summary.Balance)))
}

func accountOfWire(payload wire.Account) model.Account {
	return model.Account{Name: payload.Name}
}

func nameOf(payload wire.Account) string { // want "nameOf reads wire.Account"
	return payload.Name
}

func accountOfRow(row view.Row) model.Account { // want "accountOfRow reads view.Row"
	return model.Account{Name: row.Name}
}

func transferOf(from, to Summary) int {
	return from.Balance - to.Balance
}

func amountOfVendor(payload vendorapi.Payload) int {
	return payload.Amount
}

func amountOfOther(payload other.Payload) int {
	return payload.Amount
}

func anonymousBalance(summary struct{ Balance int }) int {
	return summary.Balance
}

func readName(reader model.Reader) string {
	return reader.Read().Name
}

func generatedName(row gen.Row) string {
	return row.Name
}

type Report struct {
	Positive bool
}

func newReport(summary Summary) Report {
	return Report{Positive: summary.Balance > 0}
}

const minimum = 10

func aboveMinimum(account model.Account) bool {
	return account.Balance > minimum
}

func wireName(account model.Account) wire.Account {
	return wire.Account{Name: account.Name}
}

func trimmedName(account model.Account) int { // want "trimmedName reads model.Account"
	return len(account.Name)
}

func upperName(account model.Account) string {
	return strings.ToUpper(account.Name)
}

func balanceOrZero[T any](summary Summary, fallback T) (int, T) {
	return summary.Balance, fallback
}

type TransferInput struct {
	Amount int
}

func transferAmount(input TransferInput) int {
	return input.Amount
}

func pointerBalance(summary *Summary) int { // want "pointerBalance reads Summary"
	return summary.Balance
}

type moveParams struct {
	amount int
}

func move(params moveParams) int {
	return params.amount
}
