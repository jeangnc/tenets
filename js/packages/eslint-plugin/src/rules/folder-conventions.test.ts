import { TSESLint } from "@typescript-eslint/utils";
import { describe, expect, it } from "vitest";
import { ruleTester } from "../rule-tester.ts";
import { folderConventions } from "./folder-conventions.ts";

const code = "export const x = 1;";

const libConventions = [
  {
    folder: "lib",
    deny: "^[A-Z]",
    message: "`{{basename}}` in `{{folder}}/` must not be a component.",
  },
];

ruleTester.run("folder-conventions", folderConventions, {
  valid: [
    { code, filename: "src/features/ledger/hooks/usePaymentDraft.ts" },
    { code, filename: "src/features/ledger/hooks/useLedgerTable.tsx" },
    { code, filename: "src/features/ledger/hooks/index.ts" },
    { code, filename: "src/features/ledger/hooks/usePaymentDraft.test.ts" },
    { code, filename: "src/features/ledger/hooks/usePaymentDraft.spec.tsx" },
    { code, filename: "src/features/ledger/lib/entrySubmit.ts" },
    { code, filename: "src/features/ledger/components/Entry/Slideout.tsx" },
    { code, filename: "src/features/ledger/components/PaymentSlideout/usePaymentDraft.test.ts" },
    { code, filename: "src/features/ledger/components/PaymentSlideout/usePaymentDraft.spec.tsx" },
    { code, filename: "src/features/ledger/components/Slideout/use.ts" },
    { code, filename: "src/features/ledger/components/Slideout/userProfile.ts" },
    { code, filename: "src/features/ledger/lib/useFoo.ts" },
    { code, filename: "src/shared/components/Select/hooks/useModel.ts" },
    { code, filename: "src/shared/hooks/useDialog/components/Dialog.tsx" },
    { code, filename: "src/features/ledger/hooks/entrySubmit.ts", options: [libConventions] },
    { code, filename: "src/features/ledger/lib/format.ts", options: [libConventions] },
  ],
  invalid: [
    {
      code,
      filename: "src/features/auth/components/useLoginSubmit.ts",
      errors: [
        {
          messageId: "violation",
          data: {
            message:
              "Hook file `useLoginSubmit.ts` lives under `components/`. Move to a sibling `hooks/` directory.",
          },
        },
      ],
    },
    {
      code,
      filename: "src/features/ledger/components/Entry/Slideout/useEntrySlideout.tsx",
      errors: [{ messageId: "violation" }],
    },
    {
      code,
      filename: "src/features/ledger/hooks/entrySubmit.ts",
      errors: [
        {
          messageId: "violation",
          data: {
            message:
              "Non-hook file `entrySubmit.ts` lives under `hooks/`. Move helpers/types to the owning concept or lift into the hook that uses them.",
          },
        },
      ],
    },
    { code, filename: "C:\\src\\hooks\\entrySubmit.ts", errors: [{ messageId: "violation" }] },
    {
      code,
      filename: "src/features/ledger/hooks/Destination.ts",
      errors: [{ messageId: "violation" }],
    },
    {
      code,
      filename: "src/features/ledger/hooks/userProfile.ts",
      errors: [{ messageId: "violation" }],
    },
    {
      code,
      filename: "src/shared/components/Select/hooks/model.ts",
      errors: [{ messageId: "violation" }],
    },
    {
      code,
      filename: "src/features/ledger/lib/Format.tsx",
      options: [libConventions],
      errors: [
        {
          messageId: "violation",
          data: { message: "`Format.tsx` in `lib/` must not be a component." },
        },
      ],
    },
    {
      code,
      filename: "src/features/ledger/lib/Format.tsx",
      options: [[{ folder: "lib", deny: "^[A-Z]" }]],
      errors: [
        {
          messageId: "violation",
          data: { message: "Basename `Format.tsx` violates folder convention." },
        },
      ],
    },
  ],
});

describe("folder-conventions options schema", () => {
  it("rejects a convention without allow or deny", () => {
    const lint = () =>
      new TSESLint.Linter({ configType: "flat" }).verify(
        code,
        {
          plugins: { local: { rules: { "folder-conventions": folderConventions } } },
          rules: { "local/folder-conventions": ["error", [{ folder: "hooks" }]] },
        },
        { filename: "src/x.js" },
      );

    expect(lint).toThrow(/allow|deny|schema/i);
  });
});
