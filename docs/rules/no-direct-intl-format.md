# no-direct-intl-format

Flags `new Intl.X(...)` and `Intl.X(...)` for `NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `ListFormat`, `PluralRules`, `Collator`, and `Segmenter`.

**Tenet:** one owner per concept. Locale-aware formatting lives in shared helpers so locale rules cannot drift between call sites. Turn the rule off inside the helpers' own module.

```ts
new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);   // ✗

formatMoney(amount, currency);                                                     // ✓
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `formatters` | none | Where the formatting helpers live, e.g. `"@/lib/format"`. Named in the message when set |
