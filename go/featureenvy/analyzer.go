package featureenvy

import (
	"errors"
	"go/ast"
	"go/parser"
	"go/token"
	"go/types"
	"slices"
	"strings"
	"sync"

	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"
)

func init() {
	register.Plugin("featureenvy", New)
}

type settings struct {
	Module  string   `json:"module"`
	Foreign []string `json:"foreign"`
}

type plugin struct {
	repository repository
	generated  generatedFiles
}

func New(raw any) (register.LinterPlugin, error) {
	decoded, err := register.DecodeSettings[settings](raw)
	if err != nil {
		return nil, err
	}
	if decoded.Module == "" {
		return nil, errors.New("featureenvy settings: module is required to tell repository packages from foreign ones")
	}
	return &plugin{repository: repository{module: decoded.Module, foreign: decoded.Foreign}}, nil
}

func (p *plugin) BuildAnalyzers() ([]*analysis.Analyzer, error) {
	return []*analysis.Analyzer{{
		Name: "featureenvy",
		Doc:  "find free functions that read only one type they could become a method of",
		Run:  p.run,
	}}, nil
}

func (p *plugin) GetLoadMode() string {
	return register.LoadModeTypesInfo
}

func (p *plugin) run(pass *analysis.Pass) (any, error) {
	for _, file := range pass.Files {
		path := pass.Fset.Position(file.Pos()).Filename
		if strings.HasSuffix(path, "_test.go") || ast.IsGenerated(file) {
			continue
		}
		for _, declaration := range file.Decls {
			function, ok := declaration.(*ast.FuncDecl)
			if !ok || function.Recv != nil || function.Body == nil || function.Type.TypeParams != nil {
				continue
			}
			if owner := p.envied(pass, function); owner != nil {
				name := types.TypeString(owner, packageName(pass.Pkg))
				pass.Reportf(function.Name.Pos(), "%s reads %s and no other type it could own; make it a method of %s", function.Name.Name, name, name)
			}
		}
	}
	return nil, nil
}

func packageName(current *types.Package) types.Qualifier {
	return func(pkg *types.Package) string {
		if pkg == current {
			return ""
		}
		return pkg.Name()
	}
}

func (p *plugin) envied(pass *analysis.Pass, function *ast.FuncDecl) *types.Named {
	owner := p.soleReadOwner(pass, function)
	if owner == nil {
		return nil
	}
	signature := pass.TypesInfo.Defs[function.Name].Type().(*types.Signature)
	if constructs(pass.Pkg, owner, signature.Results()) {
		return nil
	}
	if !fitsOwnerPackage(pass, function, owner.Obj().Pkg()) {
		return nil
	}
	return owner
}

func (p *plugin) soleReadOwner(pass *analysis.Pass, function *ast.FuncDecl) *types.Named {
	parameters := p.ownableParameters(pass, function)
	if len(parameters) == 0 {
		return nil
	}
	written := writtenSelectors(function.Body)
	var read []types.Object
	ast.Inspect(function.Body, func(node ast.Node) bool {
		selector, ok := node.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		if _, skip := written[selector]; skip {
			return true
		}
		selection := pass.TypesInfo.Selections[selector]
		if selection == nil || selection.Kind() == types.MethodExpr {
			return true
		}
		identifier := baseIdentifier(selector.X)
		if identifier == nil {
			return true
		}
		object := pass.TypesInfo.Uses[identifier]
		if _, isParameter := parameters[object]; isParameter && !slices.Contains(read, object) {
			read = append(read, object)
		}
		return true
	})
	if len(read) != 1 {
		return nil
	}
	return parameters[read[0]]
}

func (p *plugin) ownableParameters(pass *analysis.Pass, function *ast.FuncDecl) map[types.Object]*types.Named {
	parameters := make(map[types.Object]*types.Named)
	for _, field := range function.Type.Params.List {
		for _, name := range field.Names {
			object := pass.TypesInfo.Defs[name]
			if object == nil {
				continue
			}
			if owner := p.ownable(pass, object.Type()); owner != nil {
				parameters[object] = owner
			}
		}
	}
	return parameters
}

func (p *plugin) ownable(pass *analysis.Pass, t types.Type) *types.Named {
	named, ok := types.Unalias(dereferenced(t)).(*types.Named)
	if !ok || types.IsInterface(named) || isParameterObject(named) {
		return nil
	}
	pkg := named.Obj().Pkg()
	if pkg == nil || (pkg.Path() != pass.Pkg.Path() && !p.repository.contains(pkg)) {
		return nil
	}
	if p.generated.declares(pass.Fset.Position(named.Obj().Pos()).Filename) {
		return nil
	}
	return named
}

func isParameterObject(named *types.Named) bool {
	name := named.Obj().Name()
	return strings.HasSuffix(name, "Input") || strings.HasSuffix(name, "Params")
}

func dereferenced(t types.Type) types.Type {
	if pointer, ok := types.Unalias(t).(*types.Pointer); ok {
		return pointer.Elem()
	}
	return t
}

func declaredType(t types.Type) *types.Named {
	for {
		switch typ := types.Unalias(t).(type) {
		case *types.Pointer:
			t = typ.Elem()
		case *types.Slice:
			t = typ.Elem()
		case *types.Array:
			t = typ.Elem()
		case *types.Map:
			t = typ.Elem()
		case *types.Named:
			return typ
		default:
			return nil
		}
	}
}

func writtenSelectors(body *ast.BlockStmt) map[*ast.SelectorExpr]struct{} {
	written := make(map[*ast.SelectorExpr]struct{})
	ast.Inspect(body, func(node ast.Node) bool {
		switch expression := node.(type) {
		case *ast.AssignStmt:
			if expression.Tok == token.ASSIGN {
				for _, lhs := range expression.Lhs {
					markChain(written, lhs)
				}
			}
		case *ast.UnaryExpr:
			if expression.Op == token.AND {
				markChain(written, expression.X)
			}
		}
		return true
	})
	return written
}

func markChain(written map[*ast.SelectorExpr]struct{}, target ast.Expr) {
	for selector, ok := target.(*ast.SelectorExpr); ok; selector, ok = selector.X.(*ast.SelectorExpr) {
		written[selector] = struct{}{}
	}
}

func baseIdentifier(expression ast.Expr) *ast.Ident {
	for {
		switch typ := expression.(type) {
		case *ast.Ident:
			return typ
		case *ast.ParenExpr:
			expression = typ.X
		case *ast.StarExpr:
			expression = typ.X
		default:
			return nil
		}
	}
}

func constructs(pkg *types.Package, owner *types.Named, results *types.Tuple) bool {
	for result := range results.Variables() {
		target := declaredType(result.Type())
		if target != nil && target.Obj() != owner.Obj() && target.Obj().Pkg() == pkg {
			return true
		}
	}
	return false
}

func fitsOwnerPackage(pass *analysis.Pass, function *ast.FuncDecl, owner *types.Package) bool {
	if owner.Path() == pass.Pkg.Path() {
		return true
	}
	self := pass.TypesInfo.Defs[function.Name]
	fits := true
	ast.Inspect(function, func(node ast.Node) bool {
		identifier, ok := node.(*ast.Ident)
		if !ok || !fits {
			return fits
		}
		needed := neededPackage(pass, identifier, self)
		if needed != nil && needed != owner && !imports(owner, needed) {
			fits = false
		}
		return fits
	})
	return fits
}

func neededPackage(pass *analysis.Pass, identifier *ast.Ident, self types.Object) *types.Package {
	object := pass.TypesInfo.Uses[identifier]
	if imported, ok := object.(*types.PkgName); ok {
		return imported.Imported()
	}
	if object == nil || object == self || object.Pkg() != pass.Pkg || object.Parent() != pass.Pkg.Scope() {
		return nil
	}
	return pass.Pkg
}

type generatedFiles struct {
	headers sync.Map
}

func (g *generatedFiles) declares(filename string) bool {
	if filename == "" {
		return false
	}
	if known, ok := g.headers.Load(filename); ok {
		return known.(bool)
	}
	file, err := parser.ParseFile(token.NewFileSet(), filename, nil, parser.PackageClauseOnly|parser.ParseComments)
	generated := err == nil && ast.IsGenerated(file)
	g.headers.Store(filename, generated)
	return generated
}

type repository struct {
	module  string
	foreign []string
}

func (r repository) contains(pkg *types.Package) bool {
	if slices.ContainsFunc(r.foreign, func(foreign string) bool { return within(pkg.Path(), foreign) }) {
		return false
	}
	return within(pkg.Path(), r.module)
}

func within(path, root string) bool {
	return path == root || strings.HasPrefix(path, root+"/")
}

func imports(pkg, dependency *types.Package) bool {
	return slices.ContainsFunc(pkg.Imports(), func(imported *types.Package) bool { return imported.Path() == dependency.Path() })
}
