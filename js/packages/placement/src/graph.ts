import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import type TypeScript from "typescript";
import { isTest, type Tree } from "./tree.ts";

type Index = Map<string, Set<string>>;

export type Graph = {
  consumers: Index;
  publishers: Index;
  imports: Map<string, Set<string>>;
};

type Walker = Graph & {
  ts: typeof TypeScript;
  sourceOf: (file: string) => TypeScript.SourceFile;
  resolveFrom: (specifier: string, from: string) => string | null;
};

const barrelFile = /^index\.tsx?$/;
const surfaceFile = "index.ts";
const maximumReexportDepth = 10;

export function graphOf(ts: typeof TypeScript, tree: Tree): Graph {
  const sources = new Map<string, TypeScript.SourceFile>();
  const sourceOf = (file: string): TypeScript.SourceFile => {
    const cached = sources.get(file);
    if (cached) return cached;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    sources.set(file, source);
    return source;
  };
  const walker: Walker = {
    ts,
    sourceOf,
    resolveFrom: resolverOf(ts, tree),
    consumers: new Map(),
    publishers: new Map(),
    imports: new Map(),
  };

  for (const file of tree.files) {
    if (!isTest(tree, file)) collect(walker, file);
  }
  return walker;
}

function resolverOf(ts: typeof TypeScript, tree: Tree): Walker["resolveFrom"] {
  const cache = new Map<string, string | null>();

  return (specifier, from) => {
    const key = `${dirname(from)}\0${specifier}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const { resolvedModule } = ts.resolveModuleName(specifier, from, tree.options, tree.host);
    const target =
      resolvedModule && !resolvedModule.isExternalLibraryImport
        ? resolve(resolvedModule.resolvedFileName)
        : null;
    const known = target !== null && tree.known.has(target) ? target : null;
    cache.set(key, known);
    return known;
  };
}

function collect(walker: Walker, file: string): void {
  const { ts } = walker;
  const targets = new Set<string>();
  const visit = (node: TypeScript.Node): void => {
    if (ts.isImportDeclaration(node)) consume(walker, file, node, targets);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier) publish(walker, file, node);
    else {
      const specifier = dynamicImportSpecifierOf(ts, node);
      if (specifier !== null)
        link(walker.consumers, walker.resolveFrom(specifier, file), file, targets);
    }
    ts.forEachChild(node, visit);
  };

  visit(walker.sourceOf(file));
  walker.imports.set(file, targets);
}

function consume(
  walker: Walker,
  file: string,
  node: TypeScript.ImportDeclaration,
  targets: Set<string>,
): void {
  const target = resolveSpecifier(walker, file, node.moduleSpecifier);
  if (!target) return;

  const index = basename(file) === surfaceFile ? walker.publishers : walker.consumers;
  const names = importedNames(walker.ts, node.importClause);
  if (!names) {
    link(index, target, file, targets);
    return;
  }
  for (const name of names) {
    link(index, originOf(walker, target, name), file, targets);
  }
}

function resolveSpecifier(
  walker: Walker,
  file: string,
  specifier: TypeScript.Expression | undefined,
): string | null {
  if (!specifier || !walker.ts.isStringLiteral(specifier)) return null;

  return walker.resolveFrom(specifier.text, file);
}

function importedNames(
  ts: typeof TypeScript,
  clause: TypeScript.ImportClause | undefined,
): string[] | null {
  const bindings = clause?.namedBindings;
  if (!clause || clause.name || !bindings || ts.isNamespaceImport(bindings)) return null;

  return bindings.elements.map((element) => (element.propertyName ?? element.name).text);
}

function link(index: Index, target: string | null, file: string, targets: Set<string>): void {
  if (!target || target === file) return;
  targets.add(target);
  const linked = index.get(target) ?? new Set<string>();
  linked.add(file);
  index.set(target, linked);
}

function publish(walker: Walker, file: string, node: TypeScript.ExportDeclaration): void {
  const target = resolveSpecifier(walker, file, node.moduleSpecifier);
  const index = barrelFile.test(basename(file)) ? walker.publishers : walker.consumers;
  link(index, target, file, new Set());
}

function dynamicImportSpecifierOf(ts: typeof TypeScript, node: TypeScript.Node): string | null {
  if (!ts.isCallExpression(node) || node.expression.kind !== ts.SyntaxKind.ImportKeyword)
    return null;
  const [specifier] = node.arguments;

  return specifier && ts.isStringLiteralLike(specifier) ? specifier.text : null;
}

function originOf(walker: Walker, file: string, name: string, depth = 0): string {
  if (depth > maximumReexportDepth) return file;

  for (const statement of walker.sourceOf(file).statements) {
    const next = reexportedOrigin(walker, file, statement, { name, depth: depth + 1 });
    if (next) return next;
  }
  return file;
}

function reexportedOrigin(
  walker: Walker,
  file: string,
  statement: TypeScript.Statement,
  { name, depth }: { name: string; depth: number },
): string | null {
  const { ts } = walker;
  if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) return null;

  const target = resolveSpecifier(walker, file, statement.moduleSpecifier);
  if (!target) return null;
  if (!statement.exportClause)
    return declares(walker, target, name) ? originOf(walker, target, name, depth) : null;
  if (!ts.isNamedExports(statement.exportClause)) return null;

  const element = statement.exportClause.elements.find((candidate) => candidate.name.text === name);
  return element
    ? originOf(walker, target, (element.propertyName ?? element.name).text, depth)
    : null;
}

function declares(walker: Walker, file: string, name: string): boolean {
  const origin = originOf(walker, file, name, 0);
  if (origin !== file) return true;

  const { ts } = walker;
  return walker.sourceOf(file).statements.some((statement) => {
    const isExported =
      (ts.getCombinedModifierFlags(statement as TypeScript.Statement & TypeScript.Declaration) &
        ts.ModifierFlags.Export) !==
      0;
    if (!isExported) return false;
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.some(
        (declaration) => declaration.name.getText() === name,
      );
    }
    return declaredNameOf(ts, statement) === name;
  });
}

function declaredNameOf(ts: typeof TypeScript, statement: TypeScript.Statement): string | null {
  const { name } = statement as { name?: TypeScript.Node };
  if (!name) return null;

  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}
