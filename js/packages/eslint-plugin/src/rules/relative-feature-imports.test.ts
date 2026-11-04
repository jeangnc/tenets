import { ruleTester } from "../rule-tester.ts";
import { relativeFeatureImports } from "./relative-feature-imports.ts";

const insideAccounts = "/repo/src/features/accounts/queries.ts";

ruleTester.run("relative-feature-imports", relativeFeatureImports, {
  valid: [
    { code: 'import { commands } from "./commands";', filename: insideAccounts },
    { code: 'import { ledger } from "@ledger/queries";', filename: insideAccounts },
    { code: 'import { accounts } from "@accountsx";', filename: insideAccounts },
    {
      code: 'import { commands } from "@accounts/commands";',
      filename: "/repo/src/app/handling.ts",
    },
    {
      code: 'import { commands } from "@accounts/commands";',
      filename: "/repo/src/features/accounts.ts",
    },
    {
      code: 'import { commands } from "@accounts/commands";',
      filename: "/repo/lib/modules/accounts/queries.ts",
      options: [{ featureRoot: "lib/modules", aliasPattern: "#{feature}" }],
    },
  ],
  invalid: [
    ...[
      'import { commands } from "@accounts/commands";',
      'import { accounts } from "@accounts";',
      'export { commands } from "@accounts/commands";',
      'export * from "@accounts/commands";',
      'const commands = import("@accounts/commands");',
    ].map((code) => ({
      code,
      filename: insideAccounts,
      errors: [{ messageId: "relative" as const, data: { feature: "accounts" } }],
    })),
    {
      code: 'import { commands } from "#accounts/commands";',
      filename: "C:\\repo\\lib\\modules\\accounts\\queries.ts",
      options: [{ featureRoot: "lib/modules/", aliasPattern: "#{feature}" }],
      errors: [{ messageId: "relative" }],
    },
  ],
});
