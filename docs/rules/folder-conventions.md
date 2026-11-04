# folder-conventions

Flags a file whose basename breaks the convention of its nearest configured ancestor folder. `*.test.*`, `*.spec.*`, and `*.testkit.*` files are skipped.

**Tenet:** a folder name is a promise about its contents. `hooks/` holds hooks; `components/` does not.

```
src/feature/components/useSubmit.ts    ✗
src/feature/hooks/format.ts            ✗
src/feature/hooks/useSubmit.ts         ✓
```

## Options

One array of conventions. Passing it replaces the defaults.

| Field | Meaning |
|---|---|
| `folder` | Path segment the convention binds to; the nearest matching segment wins |
| `deny` | Regex; matching basenames are reported |
| `allow` | Regex; non-matching basenames are reported |
| `message` | Report text; `{{basename}}` and `{{folder}}` are substituted |

Each entry needs `allow`, `deny`, or both.

Default:

```js
[
  { folder: "components", deny: "^use[A-Z][A-Za-z0-9]*\\.(ts|tsx)$" },
  { folder: "hooks", allow: "^(use[A-Z][A-Za-z0-9]*|index)\\.(ts|tsx)$" },
]
```
