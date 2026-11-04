import type { TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

const FORMATS = new Set([
  "NumberFormat",
  "DateTimeFormat",
  "RelativeTimeFormat",
  "ListFormat",
  "PluralRules",
  "Collator",
  "Segmenter",
]);

type Options = [{ formatters?: string }];

export const noDirectIntlFormat = createRule<Options, "direct" | "directWithFormatters">({
  name: "no-direct-intl-format",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow constructing Intl.<Format> directly. Route locale-aware formatting through shared helpers.",
    },
    schema: [
      {
        type: "object",
        properties: { formatters: { type: "string", minLength: 1 } },
        additionalProperties: false,
      },
    ],
    messages: {
      direct:
        "Don't construct Intl.{{format}} directly. Use a shared formatting helper so locale rules stay in one place.",
      directWithFormatters:
        "Don't construct Intl.{{format}} directly. Use the formatters from {{formatters}} so locale rules stay in one place.",
    },
  },
  defaultOptions: [{}],
  create(context, [{ formatters }]) {
    function check(node: TSESTree.NewExpression | TSESTree.CallExpression) {
      const format = intlFormatName(node.callee);
      if (format === null) return;
      if (formatters === undefined) {
        context.report({ node, messageId: "direct", data: { format } });
        return;
      }
      context.report({ node, messageId: "directWithFormatters", data: { format, formatters } });
    }

    return { NewExpression: check, CallExpression: check };
  },
});

function intlFormatName(callee: TSESTree.Expression): string | null {
  if (callee.type !== "MemberExpression" || callee.computed) return null;
  if (callee.object.type !== "Identifier" || callee.object.name !== "Intl") return null;
  if (callee.property.type !== "Identifier" || !FORMATS.has(callee.property.name)) return null;
  return callee.property.name;
}
