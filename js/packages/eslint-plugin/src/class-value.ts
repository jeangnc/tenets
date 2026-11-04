import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

const CLASS_KEY = /^([a-z]+ClassName|className|class)$/;

export function classValueListeners(
  onClassValue: (value: TSESTree.Node) => void,
): TSESLint.RuleListener {
  return {
    JSXAttribute(node) {
      if (node.name.type !== "JSXIdentifier" || !CLASS_KEY.test(node.name.name)) return;
      if (node.value?.type === "Literal") onClassValue(node.value);
      if (node.value?.type === "JSXExpressionContainer") onClassValue(node.value.expression);
    },
    Property(node) {
      if (node.computed) return;
      const keyName = propertyKeyName(node.key);
      if (keyName === null || !CLASS_KEY.test(keyName)) return;
      onClassValue(node.value);
    },
  };
}

export function classText(value: TSESTree.Node): string | null {
  if (isStringLiteral(value)) return value.value;
  if (value.type !== "TemplateLiteral") return null;
  return value.quasis.map((quasi) => quasi.value.cooked).join(" ");
}

export function isStringLiteral(node: TSESTree.Node): node is TSESTree.StringLiteral {
  return node.type === "Literal" && typeof node.value === "string";
}

function propertyKeyName(key: TSESTree.PropertyName): string | null {
  if (key.type === "Identifier") return key.name;
  if (isStringLiteral(key)) return key.value;
  return null;
}
