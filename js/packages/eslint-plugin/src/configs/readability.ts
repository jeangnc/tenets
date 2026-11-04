import type { Linter } from "eslint";

export const basicReadabilityRules: Linter.RulesRecord = {
  "no-nested-ternary": "error",
  "max-lines-per-function": [
    "error",
    { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
  ],
  "max-depth": ["error", 3],
  "max-params": ["error", 4],
};

export const readabilityRules: Linter.RulesRecord = {
  ...basicReadabilityRules,
  complexity: ["error", 10],
  "sonarjs/cognitive-complexity": ["error", 15],
};
