package model

type Account struct {
	Name    string
	Balance int
}

type Reader interface {
	Read() Account
}
