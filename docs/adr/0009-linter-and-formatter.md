# ADR-0009: Adopt oxlint as linter and oxfmt as formatter

## Status

Accepted

## Context

A linter and formatter need to be introduced to unify code quality and maintain consistent style. Common options for TypeScript projects are:

| Tool | Role | Implementation language | Notes |
| --- | --- | --- | --- |
| ESLint + Prettier | Lint + Format | JavaScript | De facto standard. Configuration tends to be complex |
| Biome | Lint + Format | Rust | Fast. Has many ESLint-compatible rules |
| oxlint | Lint | Rust | From the Oxc project. ESLint-compatible |
| oxfmt | Format | Rust | From the Oxc project. Supports Prettier-compatible configuration |

## Decision

Adopt **oxlint as the linter and oxfmt as the formatter**.

Reasons:

1. **Fast**: Both are written in Rust and operate tens of times faster than ESLint/Prettier
2. **Compatibility**: oxlint conforms to ESLint v8 configuration format; oxfmt can be migrated from Prettier configuration. Existing knowledge transfers
3. **Same ecosystem**: Both tools come from the Oxc project, so future integration (LSP, etc.) is expected
4. **Lightweight configuration**: `.oxlintrc.json` / `.oxfmtrc.json` provide practical defaults

### Enabled rule categories (oxlint)

Only `correctness` (default) is enabled as `error`; `suspicious` / `pedantic`, etc. remain disabled. The policy is to avoid excessive noise and only detect clearly incorrect code.

Plugins:
- `typescript` — TypeScript-specific rules
- `unicorn` — Modern JavaScript/TypeScript idiomatic patterns
- `oxc` — Oxc-specific rules

### npm scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `lint` | `oxlint src/` | Lint (CI and local) |
| `lint:fix` | `oxlint src/ --fix` | Auto-fix |
| `fmt` | `oxfmt src/` | Apply formatting |
| `fmt:check` | `oxfmt src/ --check` | Verify formatting (for CI) |

## Consequences

- ESLint was removed from `package.json` scripts (it was not present as a dependency, so no impact)
- oxlint does not cover all ESLint rules; if a rule that only ESLint can detect is needed in the future, running both in parallel can be considered
- The oxfmt configuration (`.oxfmtrc.json`) is left at its defaults; `printWidth` and `tabWidth` can be adjusted as needed
