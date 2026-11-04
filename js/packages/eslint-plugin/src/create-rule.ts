import { ESLintUtils } from "@typescript-eslint/utils";

export const createRule = ESLintUtils.RuleCreator<{ requiresTypeChecking?: boolean }>(
  (name) => `https://github.com/jeangnc/tenets/blob/main/docs/rules/${name}.md`,
);
