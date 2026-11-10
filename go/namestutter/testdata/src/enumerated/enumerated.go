package enumerated

import "time"

type Status struct{ v string }

var (
	StatusOpen    = Status{v: "open"}
	StatusClosed  = Status{v: "closed"}
	StatusOverdue = Status{v: "overdue"}
)

var (
	timeoutRead  time.Duration // want `identifiers \[timeoutIdle, timeoutRead, timeoutWrite\] share prefix "timeout"`
	timeoutWrite time.Duration
	timeoutIdle  time.Duration
)
