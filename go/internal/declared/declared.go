package declared

import (
	"go/ast"
	"go/token"
	"go/types"
	"strings"

	"golang.org/x/tools/go/analysis"
)

type Name struct {
	Ident      *ast.Ident
	Enumerated bool
}

func Siblings(pass *analysis.Pass) [][]Name {
	packageLevel := []Name{}
	methods := map[string][]Name{}
	var receivers []string
	for _, file := range authored(pass) {
		for _, declaration := range file.Decls {
			switch declaration := declaration.(type) {
			case *ast.FuncDecl:
				receiver := receiverName(declaration)
				if receiver == "" {
					packageLevel = appendNamed(packageLevel, Name{Ident: declaration.Name})
					continue
				}
				if _, seen := methods[receiver]; !seen {
					receivers = append(receivers, receiver)
				}
				methods[receiver] = appendNamed(methods[receiver], Name{Ident: declaration.Name})
			case *ast.GenDecl:
				packageLevel = append(packageLevel, specNames(pass, declaration)...)
			}
		}
	}
	groups := [][]Name{packageLevel}
	for _, receiver := range receivers {
		groups = append(groups, methods[receiver])
	}
	return groups
}

func authored(pass *analysis.Pass) []*ast.File {
	files := make([]*ast.File, 0, len(pass.Files))
	for _, file := range pass.Files {
		path := pass.Fset.Position(file.Pos()).Filename
		if strings.HasSuffix(path, "_test.go") || ast.IsGenerated(file) {
			continue
		}
		files = append(files, file)
	}
	return files
}

func receiverName(function *ast.FuncDecl) string {
	if function.Recv == nil || len(function.Recv.List) == 0 {
		return ""
	}
	expression := function.Recv.List[0].Type
	for {
		switch typed := expression.(type) {
		case *ast.StarExpr:
			expression = typed.X
		case *ast.IndexExpr:
			expression = typed.X
		case *ast.IndexListExpr:
			expression = typed.X
		case *ast.Ident:
			return typed.Name
		default:
			return ""
		}
	}
}

func specNames(pass *analysis.Pass, declaration *ast.GenDecl) []Name {
	var names []Name
	for _, spec := range declaration.Specs {
		switch spec := spec.(type) {
		case *ast.TypeSpec:
			names = appendNamed(names, Name{Ident: spec.Name})
		case *ast.ValueSpec:
			for _, ident := range spec.Names {
				names = appendNamed(names, Name{Ident: ident, Enumerated: isEnumerated(pass, declaration.Tok, ident)})
			}
		}
	}
	return names
}

func isEnumerated(pass *analysis.Pass, kind token.Token, ident *ast.Ident) bool {
	object := pass.TypesInfo.Defs[ident]
	if object == nil {
		return false
	}
	named, ok := types.Unalias(object.Type()).(*types.Named)
	if !ok {
		return false
	}
	return kind == token.CONST || named.Obj().Pkg() == pass.Pkg
}

func appendNamed(names []Name, name Name) []Name {
	if name.Ident.Name == "_" || name.Ident.Name == "init" {
		return names
	}
	return append(names, name)
}
