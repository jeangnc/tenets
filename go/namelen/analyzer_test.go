package namelen

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"
)

func TestAnalyzer_Run_ReportsNamesPastTheWordLimit(t *testing.T) {
	plugin, err := New(nil)
	if err != nil {
		t.Fatal(err)
	}
	analyzers, err := plugin.BuildAnalyzers()
	if err != nil {
		t.Fatal(err)
	}
	analysistest.Run(t, analysistest.TestData(), analyzers[0], "long")
}
