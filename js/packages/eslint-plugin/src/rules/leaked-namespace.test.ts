import path from "node:path";
import { ruleTester } from "../rule-tester.ts";
import { leakedNamespace } from "./leaked-namespace.ts";

const fixture = (file: string) =>
  path.join(import.meta.dirname, "fixtures", "leaked-namespace", file);
const code = "export {};";

ruleTester.run("leaked-namespace", leakedNamespace, {
  valid: [
    { code, filename: fixture("lone/Solo.tsx") },
    { code, filename: fixture("short-token/Aa.tsx") },
    { code, filename: fixture("already-namespaced/FooBar.tsx") },
    { code, filename: fixture("test-siblings/FooBar.tsx") },
    { code, filename: fixture("non-modules/FooBar.test.tsx") },
    { code, filename: fixture("non-modules/index.ts") },
    { code, filename: fixture("type-root/FooBar.tsx") },
    {
      code,
      filename: fixture("icons/UndoRedoToolbar.tsx"),
      options: [{ ignore: ["Icon\\.tsx?$"] }],
    },
    { code, filename: fixture("inner-substring/fooWire.ts") },
    { code, filename: fixture("generated-suffix/fooWire.ts") },
    { code, filename: fixture("pascal-prefix/FooBar.tsx"), options: [{ minTokenLength: 4 }] },
    { code, filename: fixture("pascal-prefix/FooBar.tsx"), options: [{ minClusterSize: 3 }] },
    { code, filename: fixture("camel-suffix/fooWire.ts"), options: [{ directions: ["prefix"] }] },
    { code, filename: "relative/FooBar.tsx" },
  ],
  invalid: [
    {
      code,
      filename: fixture("pascal-prefix/FooBar.tsx"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "FooBar.tsx, FooBaz.tsx",
            directory: "Foo",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("bare-token/AccountHeader.tsx"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "Account",
            members: "Account.tsx, AccountHeader.tsx",
            directory: "Account",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("bare-token/Account.tsx"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "Account",
            members: "Account.tsx, AccountHeader.tsx, Accounts.tsx",
            directory: "Account",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("non-modules/FooBar.tsx"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "FooBar.tsx, FooBaz.tsx",
            directory: "Foo",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("lower-prefix/fooBar.ts"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "foo",
            members: "fooBar.ts, fooBaz.ts",
            directory: "foo",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("icons/UndoRedoToolbar.tsx"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "Undo",
            members: "UndoIcon.tsx, UndoRedoToolbar.tsx",
            directory: "Undo",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("camel-suffix/fooWire.ts"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "suffix",
            token: "Wire",
            members: "barWire.ts, fooWire.ts",
            directory: "wire",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("snake-suffix/foo_wire.ts"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "suffix",
            token: "wire",
            members: "bar_wire.ts, foo_wire.ts",
            directory: "wire",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("snake-prefix/foo_bar.ts"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "foo",
            members: "foo_bar.ts, foo_baz.ts",
            directory: "foo",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("prefix-and-suffix/fooWire.ts"),
      errors: [
        {
          messageId: "leakedNamespace",
          data: {
            direction: "prefix",
            token: "foo",
            members: "fooBarWire.ts, fooWire.ts",
            directory: "foo",
          },
        },
        {
          messageId: "leakedNamespace",
          data: {
            direction: "suffix",
            token: "Wire",
            members: "fooBarWire.ts, fooWire.ts",
            directory: "wire",
          },
        },
      ],
    },
  ],
});
