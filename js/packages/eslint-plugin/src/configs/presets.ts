import type { Linter } from "eslint";
import type { RuleName } from "../rules.ts";

type Preset = Partial<Record<`tenets/${RuleName}`, Linter.RuleEntry>>;

export const recommended: Preset = {
  "tenets/destructure-dot-access": "error",
  "tenets/destructure-jsx-dot-access": "error",
  "tenets/leaked-namespace": "error",
};

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
