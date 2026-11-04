import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { isStringLiteral } from "../class-value.ts";
import { createRule } from "../create-rule.ts";

const CLASS_ATTRIBUTES = new Set(["className", "class"]);
const PREVIEW_LENGTH = 60;

export const noDuplicateClassString = createRule({
  name: "no-duplicate-class-string",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow duplicate class strings in className/class within a file. Extract a component or variant.",
    },
    schema: [],
    messages: {
      duplicate:
        "Class string '{{preview}}' duplicated {{count}}× in this file. Extract a shared component or a variant — don't share styles via copy-paste or a const.",
    },
  },
  defaultOptions: [],
  create(context) {
    const occurrencesByText = new Map<string, TSESTree.Node[]>();

    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || !CLASS_ATTRIBUTES.has(node.name.name)) return;
        const value = attributeValue(node);
        if (value === null) return;
        const text = resolvedText(value, context.sourceCode.getScope(node))?.trim();
        if (!text) return;
        occurrencesByText.set(text, [...(occurrencesByText.get(text) ?? []), value]);
      },
      "Program:exit"() {
        for (const [text, occurrences] of occurrencesByText) {
          if (occurrences.length < 2) continue;
          for (const occurrence of occurrences) {
            context.report({
              node: occurrence,
              messageId: "duplicate",
              data: { preview: preview(text), count: String(occurrences.length) },
            });
          }
        }
      },
    };
  },
});

function attributeValue(attribute: TSESTree.JSXAttribute): TSESTree.Node | null {
  if (attribute.value?.type === "Literal") return attribute.value;
  if (attribute.value?.type === "JSXExpressionContainer") return attribute.value.expression;
  return null;
}

function resolvedText(value: TSESTree.Node, scope: TSESLint.Scope.Scope): string | null {
  if (value.type === "Identifier") return constInitializerText(value, scope);
  return staticText(value);
}

function constInitializerText(
  identifier: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
): string | null {
  const reference = scope.references.find((candidate) => candidate.identifier === identifier);
  const definition = reference?.resolved?.defs[0];
  if (definition?.type !== "Variable" || definition.parent.kind !== "const") return null;
  if (definition.node.id.type !== "Identifier" || definition.node.init === null) return null;
  return staticText(definition.node.init);
}

function staticText(node: TSESTree.Node): string | null {
  if (isStringLiteral(node)) return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }
  return null;
}

function preview(text: string): string {
  if (text.length <= PREVIEW_LENGTH) return text;
  return `${text.slice(0, PREVIEW_LENGTH - 3)}…`;
}
