# destructure-dot-access

Flags a hook return dot-accessed `minCount` or more times, or an import dot-accessed `minCount` or more times anywhere in the module.

**Tenet:** call sites read flat. Name what you use once, at the top, instead of reaching into the same object repeatedly.

```ts
const query = useEntries();
return query.isLoading ? null : query.data;      // ✗

const { isLoading, data } = useEntries();
return isLoading ? null : data;                   // ✓
```

Skipped: `useRef` and `useSharedValue` returns (their `.current` / `.value` is a live accessor), `useQueryClient` returns (a class instance whose methods lose `this` when destructured), and the bases `screen`, `fireEvent`, `userEvent`, `React`, `z`, `vi`, `expect`, `it`, `test`, and `describe`, whose members are meant to be dot-accessed (`vi.mock` must stay a call on `vi` to be hoisted).

## Options

| Option | Default | Meaning |
|---|---|---|
| `minCount` | `2` | Accesses needed to report |
| `allowBase` | `[]` | Extra base names never reported, e.g. `["Platform", "StyleSheet"]` |
