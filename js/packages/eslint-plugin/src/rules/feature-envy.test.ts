import path from "node:path";
import {
  RuleTester,
  type InvalidTestCase,
  type ValidTestCase,
} from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import { TSESLint } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";
import { featureEnvy } from "./feature-envy.ts";

const fixtureRoot = path.join(import.meta.dirname, "fixtures", "feature-envy");
const ledger = path.join(fixtureRoot, "src", "features", "ledger");
const budget = path.join(fixtureRoot, "src", "features", "budget");
const inBudget = (file: string) => path.join(budget, file);
const postingImport = 'import type { Posting } from "../ledger/entry";';

type Options = [{ featureRoots?: string[] }];

const typedRuleTester = new RuleTester({
  languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: fixtureRoot } },
});

const envy = () => [{ messageId: "envy" as const }];

typedRuleTester.run("feature-envy", featureEnvy, {
  valid: (
    [
      {
        name: "a function that reads a type owned by its own feature",
        code: 'import type { Posting } from "./entry";\nexport const total = (posting: Posting) => posting.amount;',
        filename: path.join(ledger, "total.ts"),
      },
      {
        name: "a function that only writes to the owned parameter",
        code: `${postingImport}\nfunction reset(posting: Posting) { posting.amount = 0; }`,
      },
      {
        name: "an inline object type",
        code: "const total = (posting: { amount: number }) => posting.amount;",
      },
      {
        name: "an interface of methods used as a port",
        code: 'import type { Clock } from "../ledger/entry";\nconst elapsed = (clock: Clock) => clock.now();',
      },
      {
        name: "a parameter object",
        code: 'import type { EntryInput } from "../ledger/entry";\nconst total = (input: EntryInput) => input.amount;',
      },
      {
        name: "a component",
        code: `${postingImport}\nexport function Row(posting: Posting) { return <div>{posting.amount}</div>; }`,
        filename: inBudget("Row.tsx"),
      },
      {
        name: "a hook",
        code: `${postingImport}\nexport const useAmount = (posting: Posting) => posting.amount;`,
      },
      {
        name: "a constructor of a type its own feature owns",
        code: `${postingImport}\nimport type { Allocation } from "./allocation";\nconst allocate = (posting: Posting): Allocation => ({ amount: posting.amount });`,
      },
      {
        name: "a function that needs a module the owner feature does not import",
        code: `${postingImport}\nimport { rate } from "../reimbursements/rate";\nconst share = (posting: Posting) => posting.amount * rate;`,
      },
      {
        name: "a function that reads two owned parameters",
        code: `${postingImport}\nimport type { Entry } from "../ledger/entry";\nconst sum = (posting: Posting, entry: Entry) => posting.amount + entry.amount;`,
      },
      {
        name: "a function nested inside another function",
        code: `${postingImport}\nexport function outer() { const inner = (posting: Posting) => posting.amount; return inner; }`,
      },
      {
        name: "a test source",
        code: `${postingImport}\nexport const total = (posting: Posting) => posting.amount;`,
        filename: inBudget("total.test.ts"),
      },
      {
        name: "a generated source",
        code: `${postingImport}\nexport const total = (posting: Posting) => posting.amount;`,
        filename: inBudget("total.gen.ts"),
      },
      {
        name: "a type outside every feature root",
        code: 'import type { Purse } from "../../../packages/wallet/purse";\nconst total = (purse: Purse) => purse.amount;',
      },
    ] satisfies ValidTestCase<Options>[]
  ).map((test) => ({ filename: inBudget("example.ts"), ...test })),
  invalid: (
    [
      {
        name: "a function that reads a type owned by another feature",
        code: `${postingImport}\nexport function total(posting: Posting) { return posting.amount; }`,
        errors: [
          {
            messageId: "envy",
            data: { name: "total", type: "Posting", feature: "src/features/ledger" },
          },
        ],
      },
      {
        name: "a function that reads a union alias owned by another feature",
        code: 'import type { Entry } from "../ledger/entry";\nconst total = (entry: Entry | null) => entry?.amount;',
        errors: envy(),
      },
      {
        name: "a function that destructures the owned parameter",
        code: `${postingImport}\nconst total = ({ amount }: Posting) => amount;`,
        errors: envy(),
      },
      {
        name: "a function that only calls a method of the owned parameter",
        code: `${postingImport}\nconst label = (posting: Posting) => posting.describe();`,
        errors: envy(),
      },
      {
        name: "a function that iterates over the owned parameter",
        code: 'import type { Book } from "../ledger/book";\nfunction count(book: Book) { let n = 0; for (const _ of book) n++; return n; }',
        errors: envy(),
      },
      {
        name: "a function whose imports the owner feature already uses",
        code: `${postingImport}\nimport { cents } from "../../shared/money";\nconst share = (posting: Posting) => cents(posting.amount);`,
        errors: envy(),
      },
      {
        name: "a type owned by a feature under a configured root",
        code: 'import type { Purse } from "../../../packages/wallet/purse";\nconst total = (purse: Purse) => purse.amount;',
        options: [{ featureRoots: ["src/features", "packages"] }],
        errors: [
          {
            messageId: "envy",
            data: { name: "total", type: "Purse", feature: "packages/wallet" },
          },
        ],
      },
    ] satisfies InvalidTestCase<"envy", Options>[]
  ).map((test) => ({ filename: inBudget("example.ts"), ...test })),
});

describe("feature-envy without type information", () => {
  it("throws an error naming the missing parser option", () => {
    const lint = () =>
      new TSESLint.Linter().verify(
        `${postingImport}\nconst total = (posting: Posting) => posting.amount;`,
        {
          files: ["**/*.ts"],
          languageOptions: { parser },
          plugins: { tenets: { rules: { "feature-envy": featureEnvy } } },
          rules: { "tenets/feature-envy": "warn" },
        },
        { filename: inBudget("example.ts") },
      );

    expect(lint).toThrow(/feature-envy needs type information/);
  });
});
