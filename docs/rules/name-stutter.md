# name-stutter

Flags three or more sibling identifiers that share a leading word or the same two trailing words. Reports once per cluster, at its first member.

**Tenet:** a word repeated across sibling names is a namespace the names are carrying by hand. Promote it to a type or package and drop it from the members.

```go
func targetLease()    {} // ✗ prefix "target" → a target type with Lease, Override, Period
func targetOverride() {}
func targetPeriod()   {}

func sumByMonth()         {} // ✗ suffix "byMonth" → a byMonth index or package
func postedSpendByMonth() {}
func OutstandingByMonth() {}
```

Siblings are a package's top-level functions, types, variables, and constants, or the methods of one receiver type. Tests and generated files are skipped.

Words split at camelCase and `_` boundaries. An acronym run is one word, so `writeJSON` has two words and `ListIDsByPayee` has four. A prefix needs at least three letters and a name of two or more words. A suffix is the last two words of a name with three or more.

A leading conventional word is skipped, and the cluster forms on the next word instead. `GetCreditCardBalance` and `creditLimit` cluster on `credit`. The default list holds Go and CRUD verbs: `err new must is has get set list find create update delete upsert handle parse validate with insert read write load save fetch build make add remove keep`. Any other shared verb (`lock`, `capture`) is reported on purpose: many siblings repeating one action suggest a type that owns it.

These never cluster:

- **Enumerated values.** A constant of a named type, or a variable whose type this package declares, is already namespaced by its type. `StatusOpen`, `StatusPaid`, and `StatusClosed` pass.
- **Sentinel errors across kinds.** An `Err` name clusters only with other `Err` names, and only by prefix. `ErrAccountRequired` never joins `accountBalance`, but `ErrSplitEmpty`, `ErrSplitOverflow`, and `ErrSplitUnbalanced` are reported.

## Go: `namestutter`

A golangci-lint module plugin.

| Setting | Default | Meaning |
|---|---|---|
| `prefixes` | `[]` | Extra leading words to skip, added to the defaults |
| `ignore` | `[]` | Cluster words to never report, matched without case, e.g. `["lock", "byMonth"]` |

```yaml
# .golangci.yml
linters:
  enable: [namestutter]
  settings:
    custom:
      namestutter:
        type: module
        settings:
          prefixes: [capture]
          ignore: [lock]
```

See the README for the `.custom-gcl.yml` build.
