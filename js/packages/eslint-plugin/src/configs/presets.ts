import type { Linter } from "eslint";
import { type RuleName, rules } from "../rules.ts";

type Preset = Partial<Record<`tenets/${RuleName}`, Linter.RuleEntry>>;

export const recommended: Preset = Object.fromEntries(
  Object.keys(rules).map((name) => [`tenets/${name}`, "error"]),
);

export const typed: Preset = {
  "tenets/feature-envy": "warn",
};

export const react: Preset = {
  "tenets/no-render-prop": "error",
};

export const reactNative: Preset = {
  "tenets/no-flashlist-empty-component": "error",
};

export const tailwind: Preset = {
  "tenets/no-important-tailwind": "error",
  "tenets/no-tailwind-space-between": "error",
  "tenets/no-duplicate-class-string": "warn",
};
