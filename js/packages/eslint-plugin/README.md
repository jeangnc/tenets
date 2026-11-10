# eslint-plugin-tenets

ESLint rules for coding principles that hold across projects: feature envy, stuttering filenames, destructuring repeated reads, folder conventions, and more.

```js
import tenets from "eslint-plugin-tenets";

export default [tenets.configs.recommended];
```

Rules, presets, and options: https://github.com/jeangnc/tenets

## Placement

A whole-graph check: a hook or component sits under the nearest component that owns all its consumers.

```js
import ts from "typescript";
import { checkPlacement } from "eslint-plugin-tenets/placement";

checkPlacement(ts, { tsconfig: "tsconfig.json", exempt: [/^lib\//], routerRoots: ["src/routes"] });
```
