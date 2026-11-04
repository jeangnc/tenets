# destructure-jsx-dot-access

Flags one JSX element whose props dot-access the same base identifier `minCount` or more times.

**Tenet:** call sites read flat. Destructure once at the top of the function.

```tsx
<Row onOpen={entry.open} onClose={entry.close} />   // ✗

const { open, close } = entry;
<Row onOpen={open} onClose={close} />               // ✓
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `minCount` | `2` | Props needed to report |
