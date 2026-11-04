import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Linter as LinterTypes, Linter } from "eslint";
import { describe, expect, it } from "vitest";
import tenets from "./index.ts";

const docsDirectory = fileURLToPath(new URL("../../../../docs/rules/", import.meta.url));
const javascriptFiles: LinterTypes.Config = { files: ["**/*.js"] };

function lint(code: string, config: LinterTypes.Config) {
  return new Linter({ configType: "flat" }).verify(code, [javascriptFiles, config], "src/value.js");
}

describe("eslint-plugin-tenets", () => {
  it.each(Object.keys(tenets.rules))("documents the %s rule", (name) => {
    expect(existsSync(`${docsDirectory}${name}.md`)).toBe(true);
  });

  it.each(Object.entries(tenets.configs).filter(([name]) => name !== "typed"))(
    "loads the %s preset without configuration errors",
    (_name, config) => {
      expect(lint("export const value = 1;\n", config)).toEqual([]);
    },
  );

  it("reports repeated dot-access through the recommended preset", () => {
    const code = "import * as format from './format';\nformat.money(1);\nformat.date(2);\n";
    expect(lint(code, tenets.configs.recommended).map(({ ruleId }) => ruleId)).toEqual([
      "tenets/destructure-dot-access",
      "tenets/destructure-dot-access",
    ]);
  });
});
