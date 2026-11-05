import { ruleTester } from "../rule-tester.ts";
import { destructureDotAccess } from "./destructure-dot-access.ts";

ruleTester.run("destructure-dot-access", destructureDotAccess, {
  valid: [
    "function C() { const { a, b } = useThing(); return a + b; }",
    "function C() { const thing = useThing(); return thing.a; }",
    "function C() { const ref = useRef(null); ref.current = 1; return ref.current; }",
    "function C() { const offset = useSharedValue(0); offset.value = 1; return offset.value; }",
    "import { screen } from 'x'; screen.getByText('a'); screen.getByRole('b');",
    "import * as React from 'react'; React.useState(); React.useMemo();",
    "import { z } from 'zod'; z.string(); z.number();",
    "import { vi } from 'vitest'; vi.mock('a'); vi.fn();",
    "import { expect } from 'vitest'; expect.any(String); expect.objectContaining({});",
    { code: "import * as format from './format'; format.money(); format.date();", options: [{ allowBase: ["format"] }] },
    {
      code: "function C() { const t = useThing(); return t.a + t.b; }",
      options: [{ minCount: 3 }],
    },
    "function C() { const thing = makeThing(); return thing.a + thing.b; }",
    "function C() { const thing = useThing(); return thing[a] + thing[b]; }",
  ],
  invalid: [
    {
      code: "function C() { const thing = useThing(); return thing.a + thing.b; }",
      errors: [{ messageId: "destructure" }, { messageId: "destructure" }],
    },
    {
      code: "function C() { const query = api.useQuery(); return query.data ?? query.error; }",
      errors: [{ messageId: "destructure" }, { messageId: "destructure" }],
    },
    {
      code: "import * as format from './format'; format.money(1); format.date(2);",
      errors: [{ messageId: "destructure" }, { messageId: "destructure" }],
    },
    {
      code: "import * as Ui from './ui'; const a = <Ui.Button />; const b = <Ui.Card />;",
      errors: [{ messageId: "destructure" }, { messageId: "destructure" }],
    },
  ],
});
