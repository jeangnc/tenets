# no-flashlist-empty-component

Bans the `ListEmptyComponent` prop.

**Why:** FlashList v2 renders it inside a bare, non-stretching `View` (`@shopify/flash-list` `dist/recyclerview/hooks/useSecondaryProps.js`), so a `flex: 1` empty state collapses to the top of the screen.

```tsx
<FlashList data={rows} ListEmptyComponent={Empty} />          // ✗

{rows.length === 0 ? <Empty /> : <FlashList data={rows} />}   // ✓
```
