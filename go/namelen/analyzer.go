package namelen

import (
	"cmp"
	"strings"

	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"

	"github.com/jeangnc/tenets/go/internal/declared"
	"github.com/jeangnc/tenets/go/internal/split"
)

const defaultMaximum = 4

var (
	conventionalPrefixes = map[string]bool{"err": true, "must": true, "new": true}
	functionWords        = map[string]bool{
		"by": true, "for": true, "of": true, "in": true, "at": true, "on": true, "to": true,
		"from": true, "with": true, "and": true, "or": true, "not": true, "as": true,
	}
)

func init() {
	register.Plugin("namelen", New)
}

type settings struct {
	Max int `json:"max"`
}

type plugin struct {
	maximum int
}

func New(raw any) (register.LinterPlugin, error) {
	decoded, err := register.DecodeSettings[settings](raw)
	if err != nil {
		return nil, err
	}
	return &plugin{maximum: cmp.Or(decoded.Max, defaultMaximum)}, nil
}

func (p *plugin) BuildAnalyzers() ([]*analysis.Analyzer, error) {
	return []*analysis.Analyzer{{
		Name: "namelen",
		Doc:  "find identifiers whose many words do the job of a package or type",
		Run:  p.run,
	}}, nil
}

func (p *plugin) GetLoadMode() string {
	return register.LoadModeTypesInfo
}

func (p *plugin) run(pass *analysis.Pass) (any, error) {
	for _, siblings := range declared.Siblings(pass) {
		for _, name := range siblings {
			if count := contentWords(name.Ident.Name); count > p.maximum {
				pass.Reportf(name.Ident.Pos(), "%s has %d words; let a package or type carry part of it", name.Ident.Name, count)
			}
		}
	}
	return nil, nil
}

func contentWords(name string) int {
	words := split.Words(name)
	if len(words) > 1 && conventionalPrefixes[strings.ToLower(words[0])] {
		words = words[1:]
	}
	count := 0
	for _, word := range words {
		if !functionWords[strings.ToLower(word)] {
			count++
		}
	}
	return count
}
