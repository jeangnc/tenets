# no-tailwind-space-between

Flags Tailwind `space-x-*` / `space-y-*` utilities (including variants and negatives) in `className`, `class`, and `*ClassName` values. Autofixes plain string literals on a `flex`/`inline-flex` container to `gap-x-*` / `gap-y-*` when the axis is unambiguous; anything else is reported without a fix.

**Why:** space-between compiles to adjacent-sibling margins, which break across `display: contents` children and conditional siblings. `gap` belongs to the container and has no such edge.

```tsx
<div className="flex flex-col space-y-4" />    // ✗

<div className="flex flex-col gap-y-4" />      // ✓
```

## Options

None.
