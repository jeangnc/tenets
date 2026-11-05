# placement

Flags a hook or component that does not sit under the nearest component owning all its consumers. It reads the whole import graph, so it runs as a script rather than as an ESLint rule.

**Tenet:** code lives under its nearest owner. A hook used by one screen belongs to that screen. A component used by two siblings belongs to their parent. Nothing used by only one subtree sits above it.

```
src/features/budget/
  BudgetPage.tsx
  BudgetPage/
    Summary.tsx              imports useTotals
    Chart.tsx                imports useTotals
  hooks/
    useTotals.ts             ✗ consumers meet under BudgetPage/ → BudgetPage/hooks/useTotals.ts
  components/
    Legend.tsx               ✗ only Chart.tsx uses it → BudgetPage/Chart/Legend.tsx
```

```
src/features/budget/hooks/useTotals.ts: its consumers meet under src/features/budget/BudgetPage/hooks/; move it there or move them under its owner
```

## Usage

```js
// scripts/lint/placement.mjs
import ts from "typescript";
import { checkPlacement } from "eslint-plugin-tenets/placement";

checkPlacement(ts, {
  tsconfig: "tsconfig.json",
  exempt: [/^src\/lib\//],
  routerRoots: ["src/routes"],
});
```

`checkPlacement` prints one line per misplacement to stderr and sets `process.exitCode = 1`. Use `findMisplacements` with the same arguments to get `{ file, home }[]` instead. Both take the project's own `typescript` so the graph matches its compiler.

## What it checks

- **Subjects:** hook files (`useThing.ts`, `useThing.tsx`) and component files (`Thing.tsx`, `index.tsx`).
- **Ownership:** a component owns the folder named after it. `Thing.tsx` owns `Thing/`, and `Thing/Thing.tsx` or `Thing/index.tsx` is the face of `Thing/`. `hooks/` and `components/` are grouping folders and own nothing.
- **Consumers:** every file that imports the subject, followed through re-exports to where it is declared. Tests and files inside the subject's own folder do not count.
- **Home:** the deepest folder containing every consumer's owner.
  - When that folder is a component: hooks go in its `hooks/`, components go directly in it.
  - Otherwise: hooks go in `hooks/`, components go in `components/` when it already exists.
- **Reported when** the home is below the subject (it sits too high), or the subject sits inside a component the home is outside of (it leaks out of its owner).

## Never reported

- Files matching `exempt`, and files or homes under a `routerRoots` folder.
- Public surfaces: anything re-exported by an `index.ts` barrel.
- Files with no consumers, or a single consumer in the same folder that owns nothing yet.
- Files that import private parts of their current owner, which the new home could not reach.
- Tests, specs, testkits, `__tests__/`, generated sources, `.d.ts`, and `node_modules`.

## Options

| Option | Default | Meaning |
|---|---|---|
| `tsconfig` | required | Path to the tsconfig whose files form the graph. Every other path is relative to its folder. |
| `exempt` | `[]` | Regexes tested against each subject's path, e.g. `[/^src\/lib\//]` for shared libraries. |
| `routerRoots` | `[]` | Folders whose layout the router dictates, e.g. `["src/routes"]`. Nothing there moves, and nothing moves into them. |
