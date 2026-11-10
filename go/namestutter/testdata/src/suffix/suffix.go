package suffix

func OutstandingByMonth() {} // want `identifiers \[OutstandingByMonth, postedSpendByMonth, sumByMonth\] share suffix "byMonth"; let a "byMonth" type or package carry it`

func postedSpendByMonth() {}

func sumByMonth() {}

func categorySplits() {}

func editSplits() {}

func entrySplits() {}

func NamesByIDs() {} // want `identifiers \[ContextsByIDs, NamesByIDs, contextsByIDs\] share suffix "byIDs"; let a "byIDs" type or package carry it`

func ContextsByIDs() {}

func contextsByIDs() {}
