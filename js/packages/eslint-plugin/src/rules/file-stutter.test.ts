import path from "node:path";
import { ruleTester } from "../rule-tester.ts";
import { fileStutter } from "./file-stutter.ts";

const fixture = (file: string) =>
  path.join(import.meta.dirname, "fixtures", "file-stutter", file);
const code = "export {};";

ruleTester.run("file-stutter", fileStutter, {
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
    { code, filename: fixture("hooks/useFoo.ts") },
    { code, filename: fixture("bare-token/Foos.tsx") },
  ],
  invalid: [
    {
      code,
      filename: fixture("hook-prefix/useFooBar.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "useFooBar.ts, useFooBaz.ts",
            target: "foo/useBar.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("hook-suffix/useBarFoo.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Foo",
            members: "useBarFoo.ts, useFoo.ts",
            target: "foo/useBar.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("hook-suffix/useFoo.ts"),
      errors: [
        {
          messageId: "namesNamespace",
          data: {
            direction: "suffix",
            token: "Foo",
            members: "useBarFoo.ts, useFoo.ts",
            directory: "foo/",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("pascal-prefix/FooBar.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "FooBar.tsx, FooBaz.tsx",
            target: "foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("bare-token/FooBar.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "Foo.tsx, FooBar.tsx",
            target: "Foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("bare-token/Foo.tsx"),
      errors: [
        {
          messageId: "namesNamespace",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "Foo.tsx, FooBar.tsx",
            directory: "Foo/",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("non-modules/FooBar.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "FooBar.tsx, FooBaz.tsx",
            target: "foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("lower-prefix/fooBar.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "foo",
            members: "fooBar.ts, fooBaz.ts",
            target: "foo/bar.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("icons/UndoRedoToolbar.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Undo",
            members: "UndoIcon.tsx, UndoRedoToolbar.tsx",
            target: "undo/RedoToolbar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("camel-suffix/fooWire.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Wire",
            members: "barWire.ts, fooWire.ts",
            target: "wire/foo.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("snake-suffix/foo_wire.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "wire",
            members: "bar_wire.ts, foo_wire.ts",
            target: "wire/foo.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("snake-prefix/foo_bar.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "foo",
            members: "foo_bar.ts, foo_baz.ts",
            target: "foo/bar.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("prefix-and-suffix/fooWire.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "foo",
            members: "fooBarWire.ts, fooWire.ts",
            target: "foo/wire.ts",
          },
        },
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Wire",
            members: "fooBarWire.ts, fooWire.ts",
            target: "wire/foo.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("grouping-prefix/components/FooBar.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "FooBar.tsx, FooBaz.tsx",
            target: "../foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("grouping-hooks/hooks/useFooBar.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "useFooBar.ts, useFooBaz.ts",
            target: "../foo/hooks/useBar.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("grouping-owner/components/FooBar.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "Foo.tsx, FooBar.tsx",
            target: "../Foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("grouping-owner/components/Foo.tsx"),
      errors: [
        {
          messageId: "namesNamespaceInGroupingFolder",
          data: {
            direction: "prefix",
            token: "Foo",
            members: "Foo.tsx, FooBar.tsx",
            directory: "../Foo/",
            target: "../Foo.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("component-suffix/BarFoo.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Foo",
            members: "BarFoo.tsx, BazFoo.tsx",
            target: "foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("grouping-suffix/components/BarFoo.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Foo",
            members: "BarFoo.tsx, BazFoo.tsx",
            target: "../foo/Bar.tsx",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("grouping-suffix-hooks/hooks/useBarFoo.ts"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Foo",
            members: "useBarFoo.ts, useBazFoo.ts",
            target: "../foo/hooks/useBar.ts",
          },
        },
      ],
    },
    {
      code,
      filename: fixture("both-directions/BarFoo.tsx"),
      errors: [
        {
          messageId: "fileStutter",
          data: {
            direction: "prefix",
            token: "Bar",
            members: "BarBaz.tsx, BarFoo.tsx",
            target: "bar/Foo.tsx",
          },
        },
        {
          messageId: "fileStutter",
          data: {
            direction: "suffix",
            token: "Foo",
            members: "BarFoo.tsx, BazFoo.tsx",
            target: "foo/Bar.tsx",
          },
        },
      ],
    },
  ],
});
