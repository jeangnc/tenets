# name-length

Flags an identifier with more than `max` content words.

**Tenet:** a long name is doing a namespace's job. Let a package or type carry part of it.

```go
func EstimatedCategorySpendBaselineThrough() {} // ✗ 5 words → estimated.CategorySpendBaseline
func ScheduleOccurrenceRowsByMonthsFrom()    {} // ✓ 4 content words
```

Words split as in [`name-stutter`](name-stutter.md). A leading `Err`, `Must`, or `New` and the function words `by for of in at on to from with and or not as` do not count. Package-level declarations and methods are checked; tests and generated files are skipped.

## Go: `namelen`

A golangci-lint module plugin.

| Setting | Default | Meaning |
|---|---|---|
| `max` | `4` | Most content words allowed |

```yaml
# .golangci.yml
linters:
  enable: [namelen]
  settings:
    custom:
      namelen:
        type: module
        settings:
          max: 4
```

See the README for the `.custom-gcl.yml` build.
