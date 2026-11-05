import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

type Options = [{ minCount?: number; allowBase?: string[] }];
type Variable = TSESLint.Scope.Variable;
type Scope = TSESLint.Scope.Scope;
type MemberAccess = TSESTree.MemberExpression | TSESTree.JSXMemberExpression;

const liveAccessorHooks = new Set(["useRef", "useSharedValue"]);
const defaultAllowedBases = ["screen", "React", "z", "vi", "expect"];

export const destructureDotAccess = createRule<Options, "destructure">({
  name: "destructure-dot-access",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Destructure hook returns and imported namespaces at the top of the function instead of dot-accessing them at call sites.",
    },
    schema: [
      {
        type: "object",
        properties: {
          minCount: { type: "integer", minimum: 2 },
          allowBase: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      destructure:
        "'{{name}}' is dot-accessed {{count}} times. Destructure at the top of the function instead.",
    },
  },
  defaultOptions: [{ minCount: 2, allowBase: [] }],
  create(context, [{ minCount = 2, allowBase = [] }]) {
    const allowedBases = new Set([...defaultAllowedBases, ...allowBase]);

    function reportIfRepeated(variable: Variable) {
      if (allowedBases.has(variable.name)) return;
      const accesses = memberAccessesOf(variable);
      if (accesses.length < minCount) return;
      for (const access of accesses) {
        context.report({
          node: access,
          messageId: "destructure",
          data: { name: variable.name, count: String(accesses.length) },
        });
      }
    }

    function walk(scope: Scope) {
      scope.variables.filter(isTracked).forEach(reportIfRepeated);
      scope.childScopes.forEach(walk);
    }

    return {
      "Program:exit"(node) {
        walk(context.sourceCode.getScope(node));
      },
    };
  },
});

function memberAccessesOf(variable: Variable): MemberAccess[] {
  return variable.references.flatMap<MemberAccess>(({ identifier }) => {
    const parent = identifier.parent;
    if (parent?.type === "MemberExpression" && parent.object === identifier && !parent.computed) {
      return [parent];
    }
    if (parent?.type === "JSXMemberExpression" && parent.object === identifier) return [parent];
    return [];
  });
}

function isTracked(variable: Variable): boolean {
  const definition = variable.defs[0];
  if (!definition) return false;
  if (definition.type === "ImportBinding") return true;
  if (definition.type !== "Variable" || definition.node.id.type !== "Identifier") return false;
  const hook = calleeName(definition.node.init);
  return hook !== null && /^use[A-Z]/.test(hook) && !liveAccessorHooks.has(hook);
}

function calleeName(init: TSESTree.Expression | null): string | null {
  if (init?.type !== "CallExpression") return null;
  const { callee } = init;
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return null;
}
