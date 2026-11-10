package exempt

import "errors"

type Status string

const (
	StatusActive    Status = "active"
	StatusCancelled Status = "cancelled"
	StatusExpired   Status = "expired"
)

type ActivityKind int

const (
	ActivityMessage ActivityKind = iota
	ActivityNote
	ActivityCall
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
	ErrInvalid  = errors.New("invalid")
)

func NewThing()     {}
func NewOther()     {}
func NewAnother()   {}
func GetAccount()   {}
func ListAccounts() {}
func FindPayee()    {}

func id()  {}
func idA() {}
func idB() {}

func insertEntry()  {}
func writeEntry()   {}
func buildEntry()   {}
func readPayee()    {}
func loadPayee()    {}
func keepCategory() {}
