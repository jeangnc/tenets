# feature-envy

Flags a module-level function whose only read parameter is a type owned by another feature, when that feature already imports everything else the function needs. Requires type information.

**Tenet:** behavior lives with the data it reads. A function that only reads another feature's type belongs in that feature.

```ts
// src/features/budget/total.ts
import type { Posting } from "../ledger/entry";

export const total = (posting: Posting) => posting.amount;   // ✗ move it into src/features/ledger
```

A parameter's type is owned by the feature directory that declares it. Never reported:

- hooks (`use*`) and functions that render (`JSX.Element`, `ReactElement`, `ReactNode`, `ReactPortal`);
- nested functions, and functions that read two or more owned parameters;
- parameters that are only written, never read;
- primitives, arrays, tuples, functions, type parameters, and inline object types;
- parameter objects (`*Input`, `*Params`, `*Props`, `*Options`) and ports (interfaces made only of methods);
- functions that return a type their own feature owns (constructors);
- functions that need a module the owner feature does not already import;
- tests, specs, testkits, generated sources, `.d.ts`, and `node_modules`.

## Type information

Enable typed linting for the files it runs on:

```js
languageOptions: {
  parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
}
```

Without it the rule throws `feature-envy needs type information to lint <file>`.

## Options

| Option | Default | Meaning |
|---|---|---|
| `featureRoots` | `["src/features"]` | Directories whose immediate children are features. Relative paths resolve against `parserOptions.tsconfigRootDir`, else ESLint's `cwd`. The first root containing a file wins. |

Messages name the feature relative to that same base, e.g. `src/features/ledger` or `../packages/money`.

```js
"tenets/feature-envy": ["warn", { featureRoots: ["src/features", "../packages"] }]
```

## Go: `featureenvy`

A golangci-lint module plugin. It flags a free function whose only read parameter is a named type from this repository, when that type's package already imports everything else the function needs. The fix is a method on that type. Tests, generated files, generic functions, and constructors are skipped.

A parameter counts as read when the function inspects its value: it selects a field or method, dereferences it, indexes or ranges over it, switches on it, or uses it as an operand. Passing it along, returning it, comparing a pointer, comparing against `nil`, and assigning through it do not count.

| Setting | Required | Meaning |
|---|---|---|
| `module` | yes | Import path prefix of this repository's packages. Types outside it are never owners. |
| `foreign` | no | Import path prefixes inside `module` that wrap third-party APIs and must not own behavior. |

```yaml
# .golangci.yml
linters:
  enable: [featureenvy]
  settings:
    custom:
      featureenvy:
        type: module
        settings:
          module: github.com/you/app
          foreign: [github.com/you/app/pkg/vendorclient]
```

See the README for the `.custom-gcl.yml` build.
