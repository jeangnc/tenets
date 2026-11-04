import { createRule } from "../create-rule.ts";

export const noFlashlistEmptyComponent = createRule({
  name: "no-flashlist-empty-component",
  meta: {
    type: "problem",
    docs: { description: "Disallow ListEmptyComponent, which FlashList v2 never stretches." },
    schema: [],
    messages: {
      banned:
        "FlashList v2 renders ListEmptyComponent inside a non-stretching View, so the empty state cannot fill the list. Branch to the empty state before rendering the list.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      "JSXAttribute[name.name='ListEmptyComponent']"(node) {
        context.report({ node, messageId: "banned" });
      },
    };
  },
});
