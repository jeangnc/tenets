# no-duplicate-class-string

Flags a `className` / `class` string that appears two or more times in one file, whether inline or through a `const` it resolves to. Every occurrence is reported.

**Tenet:** duplication is an extraction signal. Repeated styling is a missing component or variant; copy-paste and a shared `const` both hide that concept.

```tsx
<li className="px-4 py-2 text-sm" />
<li className="px-4 py-2 text-sm" />    // ✗ both

<ListItem />
<ListItem />                            // ✓
```

Cross-file duplication is out of scope; pair with `sonarjs/no-duplicate-string` or jscpd.

## Options

None.
