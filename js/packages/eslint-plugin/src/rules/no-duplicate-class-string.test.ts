import { ruleTester } from "../rule-tester.ts";
import { noDuplicateClassString } from "./no-duplicate-class-string.ts";

const longClasses =
  "flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-2";

ruleTester.run("no-duplicate-class-string", noDuplicateClassString, {
  valid: [
    '<><div className="p-4" /><div className="p-2" /></>',
    '<><div className="" /><div className="" /></>',
    '<><div title="p-4" /><div title="p-4" /></>',
    "<><div className={`p-4 ${a}`} /><div className={`p-4 ${a}`} /></>",
    'let base = "p-4"; <><div className={base} /><div className="p-4" /></>',
    'const props = { className: "p-4" }; const other = { className: "p-4" };',
    '<><div headerClassName="p-4" /><div headerClassName="p-4" /></>',
  ],
  invalid: [
    {
      code: '<><div className="p-4 text-sm" /><span className="p-4 text-sm" /></>',
      errors: [
        { messageId: "duplicate", data: { preview: "p-4 text-sm", count: "2" } },
        { messageId: "duplicate", data: { preview: "p-4 text-sm", count: "2" } },
      ],
    },
    {
      code: '<><div class="p-4" /><div className=" p-4 " /></>',
      errors: [{ messageId: "duplicate" }, { messageId: "duplicate" }],
    },
    {
      code: "<><div className={'p-4'} /><div className={`p-4`} /><div className=\"p-4\" /></>",
      errors: [
        { messageId: "duplicate", data: { preview: "p-4", count: "3" } },
        { messageId: "duplicate", data: { preview: "p-4", count: "3" } },
        { messageId: "duplicate", data: { preview: "p-4", count: "3" } },
      ],
    },
    {
      code: 'const base = "p-4"; <><div className={base} /><div className="p-4" /></>',
      errors: [{ messageId: "duplicate" }, { messageId: "duplicate" }],
    },
    {
      code: `<><div className="${longClasses}" /><div className="${longClasses}" /></>`,
      errors: [
        { messageId: "duplicate", data: { preview: `${longClasses.slice(0, 57)}…`, count: "2" } },
        { messageId: "duplicate", data: { preview: `${longClasses.slice(0, 57)}…`, count: "2" } },
      ],
    },
  ],
});
