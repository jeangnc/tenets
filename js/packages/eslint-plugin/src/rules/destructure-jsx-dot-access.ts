import type { TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

type Options = [{ minCount?: number }];

export const destructureJsxDotAccess = createRule<Options, "destructure">({
  name: "destructure-jsx-dot-access",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow repeated dot-access from the same base identifier across props on one JSX element.",
    },
    schema: [
      {
        type: "object",
        properties: { minCount: { type: "integer", minimum: 2 } },
        additionalProperties: false,
      },
    ],
    messages: {
      destructure:
        "'{{name}}' is dot-accessed in {{count}} props on this element. Destructure at the top of the function instead.",
    },
  },
  defaultOptions: [{ minCount: 2 }],
  create(context, [{ minCount = 2 }]) {
    return {
      JSXOpeningElement(node) {
        for (const [name, accesses] of accessesByBase(node)) {
          if (accesses.length < minCount) continue;
          for (const access of accesses) {
            context.report({
              node: access,
              messageId: "destructure",
              data: { name, count: String(accesses.length) },
            });
          }
        }
      },
    };
  },
});

function accessesByBase(node: TSESTree.JSXOpeningElement) {
  const buckets = new Map<string, TSESTree.MemberExpression[]>();
  for (const attribute of node.attributes) {
    if (attribute.type !== "JSXAttribute" || attribute.value?.type !== "JSXExpressionContainer") {
      continue;
    }
    const expression = attribute.value.expression;
    if (expression.type !== "MemberExpression" || expression.computed) continue;
    const base = rootObject(expression);
    if (base.type !== "Identifier") continue;
    buckets.set(base.name, [...(buckets.get(base.name) ?? []), expression]);
  }
  return buckets;
}

function rootObject(expression: TSESTree.MemberExpression): TSESTree.Expression {
  let base = expression.object;
  while (base.type === "MemberExpression") base = base.object;
  return base;
}
