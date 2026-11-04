# no-render-prop

Flags `render[A-Z]*` members of an `interface *Props` unless the same file calls that render prop inside iteration (`.map`, `.forEach`, `.flatMap`, `.reduce`, `.reduceRight`, `.filter`, `.find`, `.some`, `.every`, or a `for`/`while` loop).

**Tenet:** fix the component API. A render prop called once at a fixed site, or only forwarded, is an escape hatch for a variant the component cannot express. Per-item callbacks required by list and virtualization libraries stay allowed.

```tsx
interface CardProps { renderHeader: () => ReactNode }    // ✗
function Card({ renderHeader }: CardProps) {
  return <section>{renderHeader()}</section>;
}

interface CardProps { children: ReactNode }              // ✓
```

## Options

None.
