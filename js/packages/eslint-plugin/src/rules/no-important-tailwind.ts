import { classText, classValueListeners } from "../class-value.ts";
import { createRule } from "../create-rule.ts";

const IMPORTANT_TOKEN = /^!\S/;

export const noImportantTailwind = createRule({
  name: "no-important-tailwind",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow !important Tailwind utilities. Fix the component API instead of overriding defaults.",
    },
    schema: [],
    messages: {
      important:
        "Avoid `!`-prefixed Tailwind utilities ({{tokens}}). `!important` fights a component default — expose the right prop or rethink the variant instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    return classValueListeners((value) => {
      const text = classText(value);
      if (text === null) return;
      const tokens = importantTokens(text);
      if (tokens.length === 0) return;
      context.report({ node: value, messageId: "important", data: { tokens: tokens.join(", ") } });
    });
  },
});

function importantTokens(text: string): string[] {
  return text.split(/\s+/).filter((token) => IMPORTANT_TOKEN.test(token));
}
