package receiver

type Ledger struct{}

func (Ledger) scheduleRows() {} // want `identifiers \[scheduleChain, scheduleRows, scheduleSpan\] share prefix "schedule"; let a "schedule" type or package carry it`

func (Ledger) scheduleChain() {}

func (*Ledger) scheduleSpan() {}

type Book struct{}

func (Book) scheduleOther() {}

func scheduleFree() {}
