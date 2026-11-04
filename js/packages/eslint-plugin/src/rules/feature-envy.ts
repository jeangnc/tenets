import path from "node:path";
import {
  ESLintUtils,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";
import ts from "typescript";
import { createRule } from "../create-rule.ts";

type Options = [{ featureRoots?: string[] }];

type Context = Readonly<TSESLint.RuleContext<"envy", Options>>;

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression;

type ParameterBinding = TSESTree.Identifier | TSESTree.ObjectPattern;

type Feature = { directory: string; label: string };

type FeatureLocator = (sourcePath: string) => Feature | null;

type Owner = { symbol: ts.Symbol; name: string; feature: Feature };

type Analysis = {
  program: ts.Program;
  checker: ts.TypeChecker;
  sourceCode: Context["sourceCode"];
  services: ParserServicesWithTypeInformation;
  locateFeature: FeatureLocator;
  home: string;
};

const excludedSource =
  /(?:^|\/)(?:__tests__|__generated__|generated|node_modules)\/|\.(?:test|spec|testkit|gen|generated)\.[cm]?[jt]sx?$|\.d\.ts$/;
const parameterObject = /(?:Input|Params|Props|Options)$/;
const hookName = /^use[A-Z]/;
const renderedType = /(?:^|\.)(?:JSX\.Element|ReactElement|ReactNode|ReactPortal)$/;
const scalar =
  ts.TypeFlags.StringLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BigIntLike |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.EnumLike |
  ts.TypeFlags.ESSymbolLike |
  ts.TypeFlags.VoidLike |
  ts.TypeFlags.Null |
  ts.TypeFlags.Any;
const dependenciesByFeature = new WeakMap<ts.Program, Map<string, Set<string>>>();

export const featureEnvy = createRule<Options, "envy">({
  name: "feature-envy",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow module-level functions that only read a type owned by another feature; move them into that feature.",
      requiresTypeChecking: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          featureRoots: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      envy: "{{name}} reads {{type}} from feature {{feature}} and nothing else it owns; move it into {{feature}}",
    },
  },
  defaultOptions: [{ featureRoots: ["src/features"] }],
  create(context, [{ featureRoots = ["src/features"] }]) {
    const sourcePath = portablePath(context.filename);
    if (excludedSource.test(sourcePath)) return {};

    const locateFeature = featureLocator(featureRoots, rootDirectoryOf(context));
    const analysis = analysisOf(context, locateFeature, homeOf(locateFeature, sourcePath));
    const inspect = (
      declaration: TSESTree.Node,
      nameNode: TSESTree.Identifier,
      fn: FunctionLike,
    ) => {
      const owner = enviedOwner(analysis, declaration, nameNode, fn);
      if (!owner) return;

      context.report({
        node: nameNode,
        messageId: "envy",
        data: {
          name: nameNode.name,
          type: owner.name,
          feature: owner.feature.label,
        },
      });
    };

    return {
      FunctionDeclaration(node) {
        if (node.id && isModuleScoped(node)) inspect(node, node.id, node);
      },
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !isModuleScoped(node.parent)) return;
        if (!isFunction(node.init)) return;

        inspect(node, node.id, node.init);
      },
    };
  },
});

function portablePath(filename: string) {
  return filename.replaceAll("\\", "/");
}

function featureLocator(roots: string[], base: string): FeatureLocator {
  const rootDirectories = roots.map((root) => portablePath(path.resolve(base, root)));
  const portableBase = portablePath(base);

  return (sourcePath) => {
    const directory = rootDirectories
      .map((root) => featureDirectoryUnder(root, sourcePath))
      .find((candidate) => candidate !== null);

    return directory ? { directory, label: path.posix.relative(portableBase, directory) } : null;
  };
}

function featureDirectoryUnder(root: string, sourcePath: string) {
  if (!sourcePath.startsWith(`${root}/`)) return null;
  const [name, ...rest] = sourcePath.slice(root.length + 1).split("/");

  return name && rest.length > 0 ? `${root}/${name}` : null;
}

function rootDirectoryOf(context: Context) {
  return context.languageOptions.parserOptions.tsconfigRootDir ?? context.cwd;
}

function homeOf(locateFeature: FeatureLocator, sourcePath: string) {
  return locateFeature(sourcePath)?.directory ?? path.posix.dirname(sourcePath);
}

function analysisOf(context: Context, locateFeature: FeatureLocator, home: string): Analysis {
  const services = typedServicesOf(context);

  return {
    program: services.program,
    checker: services.program.getTypeChecker(),
    sourceCode: context.sourceCode,
    services,
    locateFeature,
    home,
  };
}

function typedServicesOf(context: Context): ParserServicesWithTypeInformation {
  const services = ESLintUtils.getParserServices(context, true);
  if (services.program) return services;

  throw new Error(
    `feature-envy needs type information to lint ${context.filename}; set languageOptions.parserOptions.projectService (or project) for this file.`,
  );
}

function enviedOwner(
  analysis: Analysis,
  declaration: TSESTree.Node,
  nameNode: TSESTree.Identifier,
  fn: FunctionLike,
) {
  const { checker, services, home } = analysis;
  if (hookName.test(nameNode.name)) return null;

  const signature = checker.getSignatureFromDeclaration(services.esTreeNodeToTSNodeMap.get(fn));
  if (!signature) return null;
  const returned = checker.getReturnTypeOfSignature(signature);
  if (renders(checker, returned)) return null;

  const owner = soleReadOwner(analysis, fn);
  if (!owner || owner.feature.directory === home) return null;
  if (constructs(analysis, returned, owner)) return null;

  return fitsOwnerFeature(analysis, declaration, fn, owner) ? owner : null;
}

function renders(checker: ts.TypeChecker, type: ts.Type) {
  return [type, ...constituentsOf(type)].some((constituent) => {
    const symbol = constituent.aliasSymbol ?? constituent.getSymbol();

    return symbol !== undefined && renderedType.test(checker.getFullyQualifiedName(symbol));
  });
}

function constituentsOf(type: ts.Type) {
  return type.isUnion() ? type.types : [type];
}

function soleReadOwner(analysis: Analysis, fn: FunctionLike) {
  const owners = fn.params
    .map(parameterBinding)
    .filter((binding): binding is ParameterBinding => binding !== null)
    .filter((binding) => isRead(analysis.sourceCode, fn, binding))
    .map((binding) => ownerOfParameter(analysis, binding))
    .filter((owner): owner is Owner => owner !== null);

  return owners.length === 1 ? owners[0] : null;
}

function parameterBinding(parameter: TSESTree.Parameter): ParameterBinding | null {
  const binding = parameter.type === "AssignmentPattern" ? parameter.left : parameter;

  return binding.type === "Identifier" || binding.type === "ObjectPattern" ? binding : null;
}

function isRead(sourceCode: Analysis["sourceCode"], fn: FunctionLike, binding: ParameterBinding) {
  if (binding.type === "ObjectPattern") return binding.properties.length > 0;

  const variable = sourceCode
    .getDeclaredVariables(fn)
    .find(({ identifiers }) => identifiers.includes(binding));

  return variable?.references.some(({ identifier }) => readsThrough(identifier)) ?? false;
}

function readsThrough(identifier: TSESTree.Identifier | TSESTree.JSXIdentifier) {
  const { parent } = identifier;
  if (parent.type === "MemberExpression" && parent.object === identifier) {
    return !isWritten(parent);
  }
  if (parent.type === "VariableDeclarator") {
    return parent.init === identifier && parent.id.type === "ObjectPattern";
  }
  if (parent.type === "AssignmentExpression") {
    return parent.right === identifier && parent.left.type === "ObjectPattern";
  }

  return parent.type === "ForOfStatement" && parent.right === identifier;
}

function isWritten(member: TSESTree.MemberExpression) {
  const { parent } = member;
  if (parent.type === "AssignmentExpression") return parent.left === member;

  return (
    parent.type === "UpdateExpression" ||
    (parent.type === "UnaryExpression" && parent.operator === "delete")
  );
}

function ownerOfParameter(analysis: Analysis, binding: ParameterBinding) {
  const { checker, services } = analysis;
  const annotation = soleNonNullable(binding.typeAnnotation?.typeAnnotation);
  const type = annotation
    ? checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(annotation))
    : checker.getNonNullableType(
        checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(binding)),
      );

  return ownerOf(analysis, type);
}

function soleNonNullable(annotation: TSESTree.TypeNode | undefined) {
  if (annotation?.type !== "TSUnionType") return annotation;
  const present = annotation.types.filter(
    ({ type }) => type !== "TSNullKeyword" && type !== "TSUndefinedKeyword",
  );

  return present.length === 1 ? present[0] : undefined;
}

function ownerOf(analysis: Analysis, type: ts.Type): Owner | null {
  const { checker, locateFeature } = analysis;
  if (isUnownable(checker, type)) return null;

  const symbol = type.aliasSymbol ?? type.getSymbol();
  const declaration = symbol?.declarations?.[0];
  if (!symbol || !declaration || symbol.getName().startsWith("__")) return null;
  if (parameterObject.test(symbol.getName()) || isPort(checker, declaration, type)) return null;

  const declaredIn = portablePath(declaration.getSourceFile().fileName);
  if (excludedSource.test(declaredIn)) return null;
  const feature = locateFeature(declaredIn);

  return feature && { symbol, name: symbol.getName(), feature };
}

function isUnownable(checker: ts.TypeChecker, type: ts.Type) {
  return (
    checker.isArrayType(type) ||
    checker.isTupleType(type) ||
    type.getCallSignatures().length > 0 ||
    type.isTypeParameter() ||
    constituentsOf(type).every(({ flags }) => (flags & scalar) !== 0)
  );
}

function isPort(checker: ts.TypeChecker, declaration: ts.Declaration, type: ts.Type) {
  if (!ts.isInterfaceDeclaration(declaration)) return false;
  const members = type.getProperties();
  const isMethod = (member: ts.Symbol) =>
    checker.getTypeOfSymbolAtLocation(member, declaration).getCallSignatures().length > 0;

  return members.length > 0 && members.every(isMethod);
}

function constructs(analysis: Analysis, returned: ts.Type, owner: Owner) {
  const { checker, locateFeature, home } = analysis;
  const awaited = checker.getAwaitedType(returned) ?? returned;

  return declaredSymbolsOf(checker, awaited).some((symbol) => {
    const declaredIn = portablePath(symbol.declarations?.[0]?.getSourceFile().fileName ?? "");

    return (
      symbol !== owner.symbol &&
      !excludedSource.test(declaredIn) &&
      homeOf(locateFeature, declaredIn) === home
    );
  });
}

function declaredSymbolsOf(checker: ts.TypeChecker, type: ts.Type): ts.Symbol[] {
  if (type.aliasSymbol) return [type.aliasSymbol];
  if (type.isUnion()) return type.types.flatMap((member) => declaredSymbolsOf(checker, member));
  const element = checker.isArrayType(type)
    ? checker.getTypeArguments(type as ts.TypeReference)[0]
    : undefined;
  if (element) return declaredSymbolsOf(checker, element);
  const symbol = type.getSymbol();

  return symbol && !symbol.getName().startsWith("__") ? [symbol] : [];
}

function fitsOwnerFeature(
  analysis: Analysis,
  declaration: TSESTree.Node,
  fn: FunctionLike,
  owner: Owner,
) {
  const dependencies = dependenciesOf(analysis, owner.feature.directory);

  return neededModulesOf(analysis, declaration, fn).every(
    (module) => module === owner.feature.directory || dependencies.has(module),
  );
}

function neededModulesOf(analysis: Analysis, declaration: TSESTree.Node, fn: FunctionLike) {
  const { sourceCode, services, home } = analysis;
  const own = new Set(sourceCode.getDeclaredVariables(declaration));

  return sourceCode
    .getScope(fn)
    .through.map(({ resolved }) => resolved)
    .filter((variable) => variable !== null && !own.has(variable))
    .flatMap((variable) => variable?.defs.slice(0, 1) ?? [])
    .map((definition) => {
      if (definition.type !== "ImportBinding" || definition.parent.type !== "ImportDeclaration") {
        return home;
      }

      return moduleOf(analysis, services.esTreeNodeToTSNodeMap.get(definition.parent.source));
    });
}

function dependenciesOf(analysis: Analysis, feature: string) {
  const byFeature = dependenciesByFeature.get(analysis.program) ?? new Map<string, Set<string>>();
  dependenciesByFeature.set(analysis.program, byFeature);
  const cached = byFeature.get(feature);
  if (cached) return cached;

  const collected = collectDependencies(analysis, feature);
  byFeature.set(feature, collected);

  return collected;
}

function collectDependencies(analysis: Analysis, feature: string) {
  const { program, locateFeature } = analysis;
  const isFeatureSource = ({ fileName }: ts.SourceFile) => {
    const sourcePath = portablePath(fileName);

    return !excludedSource.test(sourcePath) && locateFeature(sourcePath)?.directory === feature;
  };

  return new Set(
    program
      .getSourceFiles()
      .filter(isFeatureSource)
      .flatMap(({ statements }) => statements)
      .map(moduleSpecifierOf)
      .filter((specifier) => specifier !== undefined && ts.isStringLiteral(specifier))
      .map((specifier) => moduleOf(analysis, specifier)),
  );
}

function moduleSpecifierOf(statement: ts.Statement) {
  return ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
    ? statement.moduleSpecifier
    : undefined;
}

function moduleOf(analysis: Analysis, specifier: ts.Expression) {
  const declaration = analysis.checker.getSymbolAtLocation(specifier)?.declarations?.[0];
  const fileName = declaration?.getSourceFile().fileName;
  const text = ts.isStringLiteralLike(specifier) ? specifier.text : specifier.getText();
  if (!fileName || fileName.includes("/node_modules/")) return packageOf(text);

  return homeOf(analysis.locateFeature, portablePath(fileName));
}

function packageOf(specifier: string) {
  const segments = specifier.split("/");

  return segments.slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
}

function isFunction(
  node: TSESTree.Expression | null,
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

function isModuleScoped(node: TSESTree.Node) {
  const { parent } = node;
  if (parent?.type === "Program") return true;

  return (
    (parent?.type === "ExportNamedDeclaration" || parent?.type === "ExportDefaultDeclaration") &&
    parent.parent.type === "Program"
  );
}
