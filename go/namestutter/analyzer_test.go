package namestutter

import (
	"testing"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/analysistest"
)

func TestAnalyzer_Run_ReportsSharedPrefix(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, nil), "prefix")
}

func TestAnalyzer_Run_ReportsSharedTwoWordSuffix(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, nil), "suffix")
}

func TestAnalyzer_Run_SkipsConventionalPrefixesAndTypedConstants(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, nil), "exempt")
}

func TestAnalyzer_Run_GroupsMethodsByReceiver(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, nil), "receiver")
}

func TestAnalyzer_Run_SkipsConfiguredPrefixes(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, map[string]any{"prefixes": []any{"capture"}}), "configured")
}

func analyzer(t *testing.T, settings map[string]any) *analysis.Analyzer {
	t.Helper()
	plugin, err := New(settings)
	if err != nil {
		t.Fatal(err)
	}
	analyzers, err := plugin.BuildAnalyzers()
	if err != nil {
		t.Fatal(err)
	}
	return analyzers[0]
}

func TestAnalyzer_Run_SkipsValuesOfLocallyDeclaredTypes(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, nil), "enumerated")
}

func TestAnalyzer_Run_ClustersSentinelErrorsApartByPrefixOnly(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), analyzer(t, nil), "sentinel")
}

func TestAnalyzer_Run_SkipsIgnoredClusters(t *testing.T) {
	settings := map[string]any{"ignore": []any{"Lock", "byMonth"}}
	analysistest.Run(t, analysistest.TestData(), analyzer(t, settings), "ignored")
}
