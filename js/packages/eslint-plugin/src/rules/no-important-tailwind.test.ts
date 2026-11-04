import { ruleTester } from "../rule-tester.ts";
import { noImportantTailwind } from "./no-important-tailwind.ts";

ruleTester.run("no-important-tailwind", noImportantTailwind, {
  valid: [
    '<div className="p-4 text-sm" />',
    '<div className="flex-wrap! p-4" />',
    '<div title="!p-4" />',
    "<div className={cn('!p-4')} />",
    'const props = { title: "!p-4" };',
    'const props = { ["className"]: "!p-4" };',
    "const props = { className: classes };",
  ],
  invalid: [
    {
      code: '<div className="!p-4 text-sm" />',
      errors: [{ messageId: "important", data: { tokens: "!p-4" } }],
    },
    {
      code: '<div class="!mt-0" />',
      errors: [{ messageId: "important", data: { tokens: "!mt-0" } }],
    },
    {
      code: "<div className={'p-2 !mx-auto !w-full'} />",
      errors: [{ messageId: "important", data: { tokens: "!mx-auto, !w-full" } }],
    },
    {
      code: "<div className={`p-4 !mt-2 ${extra}`} />",
      errors: [{ messageId: "important", data: { tokens: "!mt-2" } }],
    },
    {
      code: 'const props = { headerClassName: "!border-0" };',
      errors: [{ messageId: "important", data: { tokens: "!border-0" } }],
    },
    {
      code: 'const props = { "bodyClassName": "!p-0" };',
      errors: [{ messageId: "important", data: { tokens: "!p-0" } }],
    },
  ],
});
