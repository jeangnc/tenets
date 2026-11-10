package namestutter

import (
	"cmp"
	"fmt"
	"go/token"
	"slices"
	"strings"

	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"

	"github.com/jeangnc/tenets/go/internal/declared"
	"github.com/jeangnc/tenets/go/internal/split"
)

const (
	minimumClusterSize = 3
	minimumAffixLength = 3
	suffixWords        = 2
)

func init() {
	register.Plugin("namestutter", New)
}

var conventionalPrefixes = []string{
	"err", "new", "must", "is", "has", "get", "set", "list", "find",
	"create", "update", "delete", "upsert", "handle", "parse", "validate", "with",
	"insert", "read", "write", "load", "save", "fetch", "build", "make", "add", "remove", "keep",
}

type settings struct {
	Prefixes []string `json:"prefixes"`
	Ignore   []string `json:"ignore"`
}

type plugin struct {
	conventional map[string]bool
	ignored      map[string]bool
}

type affix struct {
	direction string
	display   string
	sentinel  bool
}

type member struct {
	name string
	pos  token.Pos
}

type cluster struct {
	affix   affix
	members []member
}

func New(raw any) (register.LinterPlugin, error) {
	decoded, err := register.DecodeSettings[settings](raw)
	if err != nil {
		return nil, err
	}
	return &plugin{
		conventional: lowered(slices.Concat(conventionalPrefixes, decoded.Prefixes)),
		ignored:      lowered(decoded.Ignore),
	}, nil
}

func (p *plugin) BuildAnalyzers() ([]*analysis.Analyzer, error) {
	return []*analysis.Analyzer{{
		Name: "namestutter",
		Doc:  "find sibling identifiers that repeat a leading word or trailing words",
		Run:  p.run,
	}}, nil
}

func (p *plugin) GetLoadMode() string {
	return register.LoadModeTypesInfo
}

func (p *plugin) run(pass *analysis.Pass) (any, error) {
	for _, siblings := range declared.Siblings(pass) {
		for _, cluster := range p.clusters(siblings) {
			report(pass, cluster)
		}
	}
	return nil, nil
}

func (p *plugin) clusters(siblings []declared.Name) []cluster {
	byAffix := make(map[affix][]member)
	var order []affix
	for _, name := range siblings {
		if name.Enumerated {
			continue
		}
		for _, found := range p.affixes(name.Ident.Name) {
			if _, seen := byAffix[found]; !seen {
				order = append(order, found)
			}
			byAffix[found] = append(byAffix[found], member{name: name.Ident.Name, pos: name.Ident.Pos()})
		}
	}
	var clusters []cluster
	for _, found := range order {
		if members := byAffix[found]; len(members) >= minimumClusterSize && !p.ignored[strings.ToLower(found.display)] {
			clusters = append(clusters, cluster{affix: found, members: members})
		}
	}
	return clusters
}

func (p *plugin) affixes(name string) []affix {
	all := split.Words(name)
	sentinel := strings.EqualFold(all[0], "err")
	words := p.significant(all)
	var found []affix
	if len(words) > 1 && len(words[0]) >= minimumAffixLength {
		found = append(found, affix{direction: "prefix", display: strings.ToLower(words[0]), sentinel: sentinel})
	}
	if !sentinel && len(words) > suffixWords {
		found = append(found, affix{direction: "suffix", display: camel(words[len(words)-suffixWords:])})
	}
	return found
}

func (p *plugin) significant(words []string) []string {
	for len(words) > 1 && p.conventional[strings.ToLower(words[0])] {
		words = words[1:]
	}
	return words
}

func camel(words []string) string {
	var builder strings.Builder
	builder.WriteString(strings.ToLower(words[0]))
	for _, word := range words[1:] {
		builder.WriteString(strings.ToUpper(word[:1]) + word[1:])
	}
	return builder.String()
}

func report(pass *analysis.Pass, found cluster) {
	first := slices.MinFunc(found.members, func(a, b member) int { return cmp.Compare(a.pos, b.pos) })
	names := make([]string, 0, len(found.members))
	for _, each := range found.members {
		names = append(names, each.name)
	}
	slices.Sort(names)
	message := fmt.Sprintf("identifiers [%s] share %s %q; let a %q type or package carry it",
		strings.Join(names, ", "), found.affix.direction, found.affix.display, found.affix.display)
	pass.Reportf(first.pos, "%s", message)
}

func lowered(words []string) map[string]bool {
	set := make(map[string]bool, len(words))
	for _, word := range words {
		set[strings.ToLower(word)] = true
	}
	return set
}
