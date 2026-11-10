package sentinel

import "errors"

var (
	ErrAccountRequired = errors.New("account required")
	ErrSplitEmpty      = errors.New("split empty") // want `identifiers \[ErrSplitEmpty, ErrSplitOverflow, ErrSplitUnbalanced\] share prefix "split"`
	ErrSplitOverflow   = errors.New("split overflow")
	ErrSplitUnbalanced = errors.New("split unbalanced")

	ErrPauseNotAllowedInSchedule  = errors.New("pause not allowed")
	ErrResumeNotAllowedInSchedule = errors.New("resume not allowed")
	ErrSkipNotAllowedInSchedule   = errors.New("skip not allowed")
)

func accountBalance() {}
func accountOwner()   {}
