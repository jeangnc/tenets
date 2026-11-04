import { ruleTester } from "../rule-tester.ts";
import { noTailwindSpaceBetween } from "./no-tailwind-space-between.ts";

const unfixableClassLists = [
  "space-y-3",
  "space-x-2",
  "md:space-y-4",
  "grid space-x-2 space-y-4",
  "flex space-y-2",
  "flex flex-wrap space-x-2",
  "flex md:flex-col space-x-2",
  "flex md:block space-x-2",
  "flex space-x-reverse space-x-2",
  "flex gap-x-4 space-x-2",
  "flex gap-4 space-x-2",
  "flex md:gap-x-4 space-x-2",
  "flex flex-wrap! space-x-2",
  "flex !flex-col space-x-2",
];

ruleTester.run("no-tailwind-space-between", noTailwindSpaceBetween, {
  valid: [
    'const C = () => <div className="flex flex-col gap-3" />;',
    'const C = () => <div className="whitespace-nowrap" />;',
    'const C = () => <div title="space-y-3" />;',
  ],
  invalid: [
    {
      code: 'const C = () => <div className="space-y-3" />;',
      errors: [{ messageId: "spaceBetween", data: { tokens: "space-y-3" } }],
    },
    {
      code: "const C = () => <div className={`p-4 space-y-6 ${x}`} />;",
      errors: [{ messageId: "spaceBetween", data: { tokens: "space-y-6" } }],
    },
    {
      code: 'const props = { bodyClassName: "space-y-1" };',
      errors: [{ messageId: "spaceBetween", data: { tokens: "space-y-1" } }],
    },
    {
      code: 'const C = () => <div className="-space-y-2" />;',
      errors: [{ messageId: "spaceBetween", data: { tokens: "-space-y-2" } }],
    },
    ...unfixableClassLists.map((classes) => ({
      code: `const C = () => <div className="${classes}" />;`,
      errors: [{ messageId: "spaceBetween" as const }],
    })),
    {
      code: 'const C = () => <div className="flex space-x-2" />;',
      output: 'const C = () => <div className="flex gap-x-2" />;',
      errors: [{ messageId: "spaceBetween", data: { tokens: "space-x-2" } }],
    },
    {
      code: 'const C = () => <div className="relative flex flex-col space-y-6 text-white" />;',
      output: 'const C = () => <div className="relative flex flex-col gap-y-6 text-white" />;',
      errors: [{ messageId: "spaceBetween" }],
    },
    {
      code: 'const C = () => <div className="flex flex-col md:space-y-4" />;',
      output: 'const C = () => <div className="flex flex-col md:gap-y-4" />;',
      errors: [{ messageId: "spaceBetween" }],
    },
    {
      code: "const C = () => <div className={'inline-flex space-x-1'} />;",
      output: 'const C = () => <div className={"inline-flex gap-x-1"} />;',
      errors: [{ messageId: "spaceBetween" }],
    },
    {
      code: 'const props = { bodyClassName: "flex flex-col space-y-1" };',
      output: 'const props = { bodyClassName: "flex flex-col gap-y-1" };',
      errors: [{ messageId: "spaceBetween" }],
    },
  ],
});
