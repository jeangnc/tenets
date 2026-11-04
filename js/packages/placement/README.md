# @jean.gnc/tenets

Whole-graph placement check: a hook or component sits under the nearest component that owns all its consumers.

```js
import ts from "typescript";
import { checkPlacement } from "@jean.gnc/tenets";

checkPlacement(ts, { tsconfig: "tsconfig.json", exempt: [/^lib\//], routerRoots: ["src/routes"] });
```

More: https://github.com/jeangnc/tenets
