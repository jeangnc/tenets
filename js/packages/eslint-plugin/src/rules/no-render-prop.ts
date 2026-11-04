import type { TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

const RENDER_PROP = /^render[A-Z]/;
const PROPS_INTERFACE = /Props$/;
const ITERATION_METHODS = new Set([
  "map",
  "forEach",
  "flatMap",
  "reduce",
  "reduceRight",
  "filter",
  "find",
  "some",
  "every",
]);
const LOOP_TYPES = new Set<string>([
  "ForStatement",
  "ForOfStatement",
  "ForInStatement",
  "WhileStatement",
  "DoWhileStatement",
]);

type RenderPropSignature = TSESTree.TSPropertySignature & { key: TSESTree.Identifier };

export const noRenderProp = createRule({
  name: "no-render-prop",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Ban render* props that are escape hatches (called once at a fixed site or only forwarded). Allow library-callback render props called inside iteration.",
    },
    schema: [],
    messages: {
      escapeHatch:
        "`{{name}}` is a render-prop escape hatch (not invoked inside iteration). Use children slot, split the component, or expose the missing variant directly. Library-callback render props (called inside .map/.forEach) are allowed.",
    },
  },
  defaultOptions: [],
  create(context) {
    const callsByName = new Map<string, TSESTree.CallExpression[]>();
    const signatures: RenderPropSignature[] = [];

    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !RENDER_PROP.test(node.callee.name)) return;
        const name = node.callee.name;
        callsByName.set(name, [...(callsByName.get(name) ?? []), node]);
      },
      TSInterfaceDeclaration(node) {
        if (!PROPS_INTERFACE.test(node.id.name)) return;
        signatures.push(...node.body.body.filter(isRenderPropSignature));
      },
      "Program:exit"() {
        for (const signature of signatures) {
          const name = signature.key.name;
          if ((callsByName.get(name) ?? []).some(isCalledInsideIteration)) continue;
          context.report({ node: signature, messageId: "escapeHatch", data: { name } });
        }
      },
    };
  },
});

function isRenderPropSignature(member: TSESTree.TypeElement): member is RenderPropSignature {
  return (
    member.type === "TSPropertySignature" &&
    member.key.type === "Identifier" &&
    RENDER_PROP.test(member.key.name)
  );
}

function isCalledInsideIteration(call: TSESTree.CallExpression): boolean {
  for (let current: TSESTree.Node | undefined = call.parent; current; current = current.parent) {
    if (LOOP_TYPES.has(current.type) || isIterationCallback(current)) return true;
  }
  return false;
}

function isIterationCallback(node: TSESTree.Node): boolean {
  if (node.type !== "ArrowFunctionExpression" && node.type !== "FunctionExpression") return false;
  const call = node.parent;
  return call.type === "CallExpression" && call.arguments.includes(node) && isIterationCall(call);
}

function isIterationCall(call: TSESTree.CallExpression): boolean {
  const callee = call.callee;
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    ITERATION_METHODS.has(callee.property.name)
  );
}
