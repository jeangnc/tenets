import { ruleTester } from "../rule-tester.ts";
import { noDirectIntlFormat } from "./no-direct-intl-format.ts";

ruleTester.run("no-direct-intl-format", noDirectIntlFormat, {
  valid: [
    "formatMoney(amount);",
    "Intl.getCanonicalLocales('en-US');",
    "Intl.supportedValuesOf('currency');",
    "new Intl['NumberFormat']('en-US');",
    "new NumberFormat('en-US');",
    "new Formatter.NumberFormat('en-US');",
  ],
  invalid: [
    {
      code: "new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });",
      errors: [{ messageId: "direct", data: { format: "NumberFormat" } }],
    },
    {
      code: "Intl.DateTimeFormat('en-US').format(date);",
      errors: [{ messageId: "direct", data: { format: "DateTimeFormat" } }],
    },
    ...["RelativeTimeFormat", "ListFormat", "PluralRules", "Collator", "Segmenter"].map(
      (format) => ({
        code: `new Intl.${format}('en');`,
        errors: [{ messageId: "direct" as const, data: { format } }],
      }),
    ),
    {
      code: "new Intl.NumberFormat('en-US');",
      options: [{ formatters: "@/lib/format" }],
      errors: [
        {
          messageId: "directWithFormatters",
          data: { format: "NumberFormat", formatters: "@/lib/format" },
        },
      ],
    },
  ],
});
