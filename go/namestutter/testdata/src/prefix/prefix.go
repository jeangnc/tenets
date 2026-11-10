package prefix

type targetLease struct{} // want `identifiers \[targetLease, targetOverride, targetPeriod\] share prefix "target"; let a "target" type or package carry it`

type targetOverride struct{}

func targetPeriod() {}

func GetCreditCardBalance() {} // want `identifiers \[GetCreditCardBalance, ListCreditCardBills, creditLimit\] share prefix "credit"; let a "credit" type or package carry it`

func ListCreditCardBills() {}

const creditLimit = 1

type Target struct{}
