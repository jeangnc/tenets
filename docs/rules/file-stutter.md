# file-stutter

Flags sibling files that repeat a filename prefix or suffix at a word boundary. Reports once per file per cluster.

**Tenet:** a repeated prefix across siblings is a leaked namespace. Promote it to a concept folder and drop it from the leaves.

```
ledger/
  FooBar.tsx         ✗ prefix 'Foo' → foo/Bar.tsx
  FooBaz.tsx         ✗ prefix 'Foo' → foo/Baz.tsx
  barWire.ts         ✗ suffix 'Wire' → wire/bar.ts
  bazWire.ts         ✗ suffix 'Wire' → wire/baz.ts
```

Each report names the file's target, relative to its folder. The concept folder is camelCase, except when a member is a component named after the token: `Foo.tsx` owns `Foo/`, so `FooBar.tsx` goes to `Foo/Bar.tsx`. A member named after the token itself (`Foo.tsx`, `useFoo.ts`) stays and is told where the others go. A file in both a prefix and a suffix cluster gets one report for each, so `BarFoo.tsx` can go to `bar/Foo.tsx` or `foo/Bar.tsx`.

Grouping folders (`components/`, `hooks/`) are not concepts, so a cluster inside one is hoisted above it. `components/` is dropped, and `hooks/` stays inside the concept. This produces the layout [`placement`](placement.md) recognizes as an owner:

```
feature/
  components/FooBar.tsx     ✗ → feature/foo/Bar.tsx
  components/FooBaz.tsx     ✗ → feature/foo/Baz.tsx
  hooks/useFooBar.ts        ✗ → feature/foo/hooks/useBar.ts
  hooks/useFooBaz.ts        ✗ → feature/foo/hooks/useBaz.ts
```

Word boundaries are an uppercase letter, `_`, or the character after `_`, so `foo_bar.ts` and `foobar.ts` never cluster, and neither do `Foo.tsx` and `Foos.tsx`. The hook marker `use` before an uppercase letter is not a token: `useFoo.ts` and `useBar.ts` never cluster, `useFooBar.ts` and `useFooBaz.ts` cluster on `Foo`, and `useBarFoo.ts` and `useFoo.ts` cluster on the suffix `Foo`. A prefix cluster is skipped when a sibling directory already has the prefix's name. `index.*`, `*.test.*`, `*.spec.*`, `*.gen.*`, `*.generated.*`, and `.d.ts` files neither report nor count as siblings. Only `.ts`, `.tsx`, `.js`, and `.jsx` files take part.

## Options

| Option | Default | Meaning |
|---|---|---|
| `directions` | `["prefix", "suffix"]` | Which ends of the filename to compare |
| `minTokenLength` | `3` | Shortest prefix or suffix reported |
| `minClusterSize` | `2` | Fewest files in a cluster |
| `ignore` | `[]` | Regexes; matching basenames are skipped, e.g. `["Icon\\.tsx?$"]` |

```js
"tenets/file-stutter": ["warn", { ignore: ["Icon\\.tsx?$"] }]
```

Sibling identifiers in a package get the same check from [`name-stutter`](name-stutter.md).

## Go: `filestutter`

A golangci-lint module plugin. It flags sibling `.go` files in one package that share a leading or trailing `_`-separated word, such as `entry_list.go` and `entry_row.go`. Tests and generated files are skipped. It takes no settings; silence a deliberate cluster with an `exclusions.rules` entry naming `filestutter`.

```yaml
# .golangci.yml
linters:
  enable: [filestutter]
  settings:
    custom:
      filestutter:
        type: module
```
