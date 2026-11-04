import type { ESLint, Linter } from "eslint";
import packageJson from "../package.json" with { type: "json" };
import * as presets from "./configs/presets.ts";
import { rules } from "./rules.ts";

export { basicReadabilityRules, readabilityRules } from "./configs/readability.ts";

const plugin: ESLint.Plugin & { rules: NonNullable<ESLint.Plugin["rules"]> } = {
  meta: { name: packageJson.name, version: packageJson.version },
  rules: rules as unknown as NonNullable<ESLint.Plugin["rules"]>,
};

const configFrom = (name: string, presetRules: Linter.RulesRecord): Linter.Config => ({
  name: `tenets/${name}`,
  plugins: { tenets: plugin },
  rules: presetRules,
});

type ConfigName = "recommended" | "typed" | "react" | "react-native" | "tailwind";
type TenetsPlugin = Omit<ESLint.Plugin, "configs"> & {
  rules: NonNullable<ESLint.Plugin["rules"]>;
  configs: Record<ConfigName, Linter.Config>;
};

const configs: Record<ConfigName, Linter.Config> = {
  recommended: configFrom("recommended", presets.recommended),
  typed: configFrom("typed", presets.typed),
  react: configFrom("react", presets.react),
  "react-native": configFrom("react-native", presets.reactNative),
  tailwind: configFrom("tailwind", presets.tailwind),
};

const tenets: TenetsPlugin = { ...plugin, configs };

export default tenets;
