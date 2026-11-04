package view

import "example.com/app/model"

type Row struct {
	Name string
}

func NewRow(account model.Account) Row {
	return Row{Name: account.Name}
}
