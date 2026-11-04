import { classText, classValueListeners, isStringLiteral } from "../class-value.ts";
import { createRule } from "../create-rule.ts";

const SPACE_BETWEEN_TOKEN = /^(?:[a-z0-9-]+:)*-?space-(x|y)-/;
const FIXABLE_SPACE_TOKEN = /^((?:[a-z0-9-]+:)*)space-(x|y)-(.+)$/;
const GAP_TOKEN = /(?:^|:)gap(?:-[xy])?-/;
const UNSAFE_LAYOUT =
  /(?:^|:)(?:grid|inline-grid|block|inline|hidden|contents|flex-wrap(?:-reverse)?|flex-(?:row|col)-reverse|space-[xy]-reverse)$/;
const VARIANT_DIRECTION = /:(?:flex|inline-flex|flex-row|flex-col)$/;

export const noTailwindSpaceBetween = createRule({
  name: "no-tailwind-space-between",
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description:
        "Disallow Tailwind space-x-*/space-y-* utilities. Adjacent-sibling margins break across display:contents children; use flex/grid gap-* instead.",
    },
    schema: [],
    messages: {
      spaceBetween:
        "Avoid Tailwind space-between utilities ({{tokens}}). They compile to adjacent-sibling margins that collapse across `display:contents` children. Use `flex flex-col gap-*` or `grid gap-*` instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    return classValueListeners((value) => {
      const text = classText(value);
      if (text === null) return;
      const tokens = spaceBetweenTokens(text);
      if (tokens.length === 0) return;
      const replacement = isStringLiteral(value) ? gapRewrite(text) : null;
      context.report({
        node: value,
        messageId: "spaceBetween",
        data: { tokens: tokens.join(", ") },
        fix:
          replacement === null
            ? null
            : (fixer) => fixer.replaceText(value, JSON.stringify(replacement)),
      });
    });
  },
});

function spaceBetweenTokens(text: string): string[] {
  return text.split(/\s+/).filter((token) => SPACE_BETWEEN_TOKEN.test(token));
}

function gapRewrite(text: string): string | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.includes("flex") && !tokens.includes("inline-flex")) return null;
  if (tokens.some((token) => token.includes("!") || GAP_TOKEN.test(token))) return null;
  if (tokens.some((token) => UNSAFE_LAYOUT.test(token) || VARIANT_DIRECTION.test(token))) {
    return null;
  }
  const axis = tokens.includes("flex-col") ? "y" : "x";
  const spacings = spaceBetweenTokens(text).map((token) => FIXABLE_SPACE_TOKEN.exec(token));
  const isAxisAligned = (spacing: RegExpExecArray | null) =>
    spacing !== null && spacing[2] === axis && spacing[3] !== "reverse";
  if (!spacings.every(isAxisAligned)) return null;
  return tokens.map((token) => token.replace(FIXABLE_SPACE_TOKEN, "$1gap-$2-$3")).join(" ");
}
