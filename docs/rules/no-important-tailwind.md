# no-important-tailwind

Flags `!`-prefixed Tailwind utilities in `className`, `class`, and `*ClassName` values (JSX attributes and object properties, string and template literals).

**Tenet:** fix the component API, not the call site. A caller reaching for `!important` is fighting a default the component does not expose; add the prop or variant instead.

```tsx
<Card className="!p-0" />          // ✗

<Card padding="none" />            // ✓
```

## Options

None.
