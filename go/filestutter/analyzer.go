package filestutter

import (
	"bytes"
	"fmt"
	"go/ast"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"
)

func init() {
	register.Plugin("filestutter", New)
}

type finding struct {
	direction string
	token     string
	files     []string
}

type plugin struct{}

func New(raw any) (register.LinterPlugin, error) {
	if _, err := register.DecodeSettings[struct{}](raw); err != nil {
		return nil, err
	}
	return &plugin{}, nil
}

func (p *plugin) BuildAnalyzers() ([]*analysis.Analyzer, error) {
	return []*analysis.Analyzer{{
		Name: "filestutter",
		Doc:  "find sibling Go filenames that repeat a word",
		Run:  p.run,
	}}, nil
}

func (p *plugin) GetLoadMode() string {
	return register.LoadModeSyntax
}

func (p *plugin) run(pass *analysis.Pass) (any, error) {
	loaded := make(map[string]*ast.File)
	for _, file := range pass.Files {
		path := pass.Fset.Position(file.Pos()).Filename
		if strings.HasSuffix(path, "_test.go") || ast.IsGenerated(file) {
			continue
		}
		loaded[path] = file
	}
	dirs := make(map[string]struct{})
	for path := range loaded {
		dirs[filepath.Dir(path)] = struct{}{}
	}
	for dir := range dirs {
		findings, err := findClusters(dir)
		if err != nil {
			return nil, err
		}
		for _, item := range findings {
			for _, name := range item.files {
				file := loaded[filepath.Join(dir, name)]
				if file == nil {
					continue
				}
				pass.Reportf(file.Package, "files [%s] repeat %s %q; consider a %s directory", strings.Join(item.files, ", "), item.direction, item.token, item.token)
				break
			}
		}
	}
	return nil, nil
}

func findClusters(dir string) ([]finding, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", dir, err)
	}
	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		generated, err := isGenerated(filepath.Join(dir, name))
		if err != nil {
			return nil, err
		}
		if !generated {
			files = append(files, name)
		}
	}
	clusters := make(map[string]map[string]struct{})
	for i, first := range files {
		for _, second := range files[i+1:] {
			for _, direction := range []string{"prefix", "suffix"} {
				token := commonToken(first, second, direction)
				if len(token) < 3 {
					continue
				}
				if direction == "prefix" && hasDirectory(entries, token) {
					continue
				}
				key := direction + ":" + token
				if clusters[key] == nil {
					clusters[key] = make(map[string]struct{})
				}
				clusters[key][first] = struct{}{}
				clusters[key][second] = struct{}{}
			}
		}
	}
	findings := make([]finding, 0, len(clusters))
	for key, members := range clusters {
		direction, token, _ := strings.Cut(key, ":")
		names := make([]string, 0, len(members))
		for name := range members {
			names = append(names, name)
		}
		slices.Sort(names)
		findings = append(findings, finding{direction: direction, token: token, files: names})
	}
	slices.SortFunc(findings, func(a, b finding) int {
		return strings.Compare(a.direction+":"+a.token, b.direction+":"+b.token)
	})
	return findings, nil
}

func commonToken(first, second, direction string) string {
	a := strings.Split(strings.TrimSuffix(first, ".go"), "_")
	b := strings.Split(strings.TrimSuffix(second, ".go"), "_")
	shared := make([]string, 0, min(len(a), len(b)))
	for i := 0; i < min(len(a), len(b)); i++ {
		left, right := a[i], b[i]
		if direction == "suffix" {
			left, right = a[len(a)-i-1], b[len(b)-i-1]
		}
		if left != right {
			break
		}
		if direction == "prefix" {
			shared = append(shared, left)
		} else {
			shared = append([]string{left}, shared...)
		}
	}
	if len(shared) == 0 || len(shared) == len(a) && len(shared) == len(b) {
		return ""
	}
	return strings.Join(shared, "_")
}

func hasDirectory(entries []os.DirEntry, name string) bool {
	return slices.ContainsFunc(entries, func(entry os.DirEntry) bool {
		return entry.IsDir() && entry.Name() == name
	})
}

func isGenerated(path string) (bool, error) {
	file, err := os.Open(path)
	if err != nil {
		return false, fmt.Errorf("read %s: %w", path, err)
	}
	defer file.Close()
	header, err := io.ReadAll(io.LimitReader(file, 512))
	if err != nil {
		return false, fmt.Errorf("read %s: %w", path, err)
	}
	return bytes.Contains(header, []byte("Code generated")), nil
}
