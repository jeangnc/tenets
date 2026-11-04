# relative-feature-imports

Flags an import, re-export, or dynamic `import()` that reaches a file's own feature through its path alias.

**Tenet:** an alias is a feature's public door for outsiders. Inside the feature, use relative paths so internal moves stay internal.

```ts
// src/features/accounts/queries.ts
import { commands } from "@accounts/commands";   // ✗
import { commands } from "./commands";           // ✓
import { ledger } from "@ledger";                // ✓ another feature
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `featureRoot` | `"src/features"` | Path segment whose immediate children are features; matched anywhere in the filename |
| `aliasPattern` | `"@{feature}"` | Alias of a feature; `{feature}` is replaced by the feature's directory name |

```js
"tenets/relative-feature-imports": ["error", { featureRoot: "lib/modules", aliasPattern: "#{feature}" }]
```
