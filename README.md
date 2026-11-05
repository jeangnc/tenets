# tenets

The coding principles I hold across projects, enforced as ESLint rules and golangci-lint analyzers. A rule lives here only if it holds without knowing a project's domain; project vocabulary enters as options.

| Tenet | ESLint (`eslint-plugin-tenets`) | Go (`github.com/jeangnc/tenets/go`) |
|---|---|---|
| Behavior lives with the data it reads | [`feature-envy`](docs/rules/feature-envy.md) | `featureenvy` |
| A repeated prefix is a leaked namespace | [`leaked-namespace`](docs/rules/leaked-namespace.md) | `leakednamespace` |
| Name what you read once | [`destructure-dot-access`](docs/rules/destructure-dot-access.md), [`destructure-jsx-dot-access`](docs/rules/destructure-jsx-dot-access.md) | |
| A folder's name is a promise about its contents | [`folder-conventions`](docs/rules/folder-conventions.md) | |
| A feature reaches itself relatively | [`relative-feature-imports`](docs/rules/relative-feature-imports.md) | |
| Format through one helper | [`no-direct-intl-format`](docs/rules/no-direct-intl-format.md) | |
| Compose components, not render props | [`no-render-prop`](docs/rules/no-render-prop.md) | |
| Styles stay predictable | [`no-important-tailwind`](docs/rules/no-important-tailwind.md), [`no-tailwind-space-between`](docs/rules/no-tailwind-space-between.md), [`no-duplicate-class-string`](docs/rules/no-duplicate-class-string.md) | |
| Lists own their empty state | [`no-flashlist-empty-component`](docs/rules/no-flashlist-empty-component.md) | |
| Code lives under its nearest owner | [`placement`](docs/rules/placement.md) | |

## ESLint

```sh
pnpm add -D eslint-plugin-tenets
```

```js
import tenets, { readabilityRules } from "eslint-plugin-tenets";

export default [
  {
    ...tenets.configs.recommended,
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
  },
  { rules: readabilityRules },
];
```

`recommended` enables every rule at `error` and needs typed linting for `feature-envy`. Subsets: `typed`, `react`, `react-native`, `tailwind`. `readabilityRules` needs `eslint-plugin-sonarjs`.

## golangci-lint

```yaml
# .custom-gcl.yml
version: v2.7.0
plugins:
  - module: github.com/jeangnc/tenets/go
    import: github.com/jeangnc/tenets/go/featureenvy
    version: v0.2.1
  - module: github.com/jeangnc/tenets/go
    import: github.com/jeangnc/tenets/go/leakednamespace
    version: v0.2.1
```

Build with `golangci-lint custom`, then run `./custom-gcl run`. Settings are in each rule's doc. [`go/golangci.base.yml`](go/golangci.base.yml) is the reference config for third-party linters.

## Releasing

```sh
cd js && pnpm bump 0.2.1
git commit -am "Release v0.2.1" && git tag -a v0.2.1 -m v0.2.1 && git push --follow-tags
```

The `v*` tag publishes `eslint-plugin-tenets` through npm trusted publishing (OIDC, with provenance) and tags the Go module `go/v0.2.1`.
