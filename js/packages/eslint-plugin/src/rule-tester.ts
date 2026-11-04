import { RuleTester } from "@typescript-eslint/rule-tester";

export const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});
