import { ruleTester } from "../rule-tester.ts";
import { destructureJsxDotAccess } from "./destructure-jsx-dot-access.ts";

ruleTester.run("destructure-jsx-dot-access", destructureJsxDotAccess, {
  valid: [
    "<Row onOpen={entry.open} label={title} />",
    "<Row onOpen={entry.open} onClose={other.close} />",
    "<Row a={entry[key]} b={entry[other]} />",
    { code: "<Row a={entry.a} b={entry.b} />", options: [{ minCount: 3 }] },
  ],
  invalid: [
    {
      code: "<Row onOpen={entry.open} onClose={entry.close} />",
      errors: [{ messageId: "destructure" }, { messageId: "destructure" }],
    },
    {
      code: "<Row a={entry.payee.name} b={entry.amount} />",
      errors: [{ messageId: "destructure" }, { messageId: "destructure" }],
    },
  ],
});
