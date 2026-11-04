# leaked-namespace

Flags sibling files that repeat a filename prefix or suffix at a word boundary. Reports once per file per cluster.

**Tenet:** a repeated prefix across siblings is a leaked namespace. Promote it to a directory and drop it from the leaves.

```
ledger/
  EntryList.tsx      ✗ prefix 'Entry' → ledger/Entry/List.tsx
  EntryRow.tsx       ✗
  fooWire.ts         ✗ suffix 'Wire' → ledger/wire/foo.ts
  barWire.ts         ✗
```

Word boundaries are an uppercase letter or the character after `_`, so `foo_bar.ts` and `foobar.ts` never cluster. A prefix cluster is skipped when a sibling directory already has the prefix's name. `index.*`, `*.test.*`, `*.spec.*`, `*.gen.*`, `*.generated.*`, and `.d.ts` files neither report nor count as siblings. Only `.ts`, `.tsx`, `.js`, and `.jsx` files take part.

## Options

| Option | Default | Meaning |
|---|---|---|
| `directions` | `["prefix", "suffix"]` | Which ends of the filename to compare |
| `minTokenLength` | `3` | Shortest prefix or suffix reported |
| `minClusterSize` | `2` | Fewest files in a cluster |
| `ignore` | `[]` | Regexes; matching basenames are skipped, e.g. `["Icon\\.tsx?$"]` |

```js
"tenets/leaked-namespace": ["warn", { ignore: ["Icon\\.tsx?$"] }]
```

## Go: `leakednamespace`

A golangci-lint module plugin. It flags sibling `.go` files in one package that share a leading or trailing `_`-separated word, such as `entry_list.go` and `entry_row.go`. Tests and generated files are skipped. It takes no settings; silence a deliberate cluster with an `exclusions.rules` entry naming `leakednamespace`.

```yaml
# .golangci.yml
linters:
  enable: [leakednamespace]
  settings:
    custom:
      leakednamespace:
        type: module
```
