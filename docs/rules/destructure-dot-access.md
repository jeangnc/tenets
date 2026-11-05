# destructure-dot-access

Flags a hook return dot-accessed `minCount` or more times, or an import dot-accessed `minCount` or more times anywhere in the module.

**Tenet:** call sites read flat. Name what you use once, at the top, instead of reaching into the same object repeatedly.

```ts
const query = useEntries();
return query.isLoading ? null : query.data;      // ✗

const { isLoading, data } = useEntries();
return isLoading ? null : data;                   // ✓
```

Skipped: `useRef` and `useSharedValue` returns (their `.current` / `.value` is a live accessor), and the bases `screen` and `React`.

## Options

| Option | Default | Meaning |
|---|---|---|
| `minCount` | `2` | Accesses needed to report |
| `allowBase` | `[]` | Extra base names never reported, e.g. `["z", "Platform", "StyleSheet"]` |
