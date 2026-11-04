import type { TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

type Options = [{ featureRoot?: string; aliasPattern?: string }];

type ModuleReference =
  | TSESTree.ImportDeclaration
  | TSESTree.ExportNamedDeclaration
  | TSESTree.ExportAllDeclaration
  | TSESTree.ImportExpression;

const featurePlaceholder = "{feature}";

export const relativeFeatureImports = createRule<Options, "relative">({
  name: "relative-feature-imports",
  meta: {
    type: "problem",
    docs: {
      description: "Require relative imports for modules inside the importing file's own feature.",
    },
    schema: [
      {
        type: "object",
        properties: {
          featureRoot: { type: "string", minLength: 1 },
          aliasPattern: { type: "string", pattern: "\\{feature\\}" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      relative: "Use a relative import inside the {{feature}} feature.",
    },
  },
  defaultOptions: [{ featureRoot: "src/features", aliasPattern: "@{feature}" }],
  create(context, [{ featureRoot = "src/features", aliasPattern = "@{feature}" }]) {
    const feature = featureOf(context.filename, featureRoot);
    if (!feature) return {};

    const alias = aliasPattern.replace(featurePlaceholder, feature);
    const check = ({ source }: ModuleReference) => {
      if (source?.type !== "Literal" || typeof source.value !== "string") return;
      if (!refersTo(source.value, alias)) return;

      context.report({ node: source, messageId: "relative", data: { feature } });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
});

function featureOf(filename: string, featureRoot: string) {
  const root = escapeRegExp(featureRoot.replace(/^\/+|\/+$/g, ""));

  return filename.replaceAll("\\", "/").match(new RegExp(`(?:^|/)${root}/([^/]+)/`))?.[1];
}

function refersTo(specifier: string, alias: string) {
  return specifier === alias || specifier.startsWith(`${alias}/`);
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
