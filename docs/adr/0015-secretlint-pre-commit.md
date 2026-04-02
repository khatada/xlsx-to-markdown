# ADR-0015: Run secretlint as a pre-commit hook and in CI to prevent secret leaks

## Status

Accepted

## Context

Accidentally committing secrets (API keys, tokens, credentials) into a repository is a common and serious security risk. The project already uses husky to run linting and formatting checks on commit. Adding a secret scanning step at both the pre-commit stage and in CI provides defense-in-depth: problems are caught locally before push, and the CI job acts as a safety net.

## Decision

Adopt [secretlint](https://github.com/secretlint/secretlint) with `@secretlint/secretlint-rule-preset-recommend` to scan all committed files for secrets.

- **Pre-commit hook** (`.husky/pre-commit`): `npm run secretlint` is appended to the existing hook so every commit is scanned locally.
- **CI** (`.github/workflows/ci.yml`): A "Secret scan" step is added to the `lint-and-format` job so pushes and pull requests are also checked on the server side.
- **Configuration** (`.secretlintrc.json`): Uses the recommended rule preset, which covers common credential patterns (AWS keys, GitHub tokens, private keys, etc.).

Alternatives considered:
- **git-secrets**: Shell-based, harder to configure consistently across platforms.
- **detect-secrets**: Python-based, adds a non-JS toolchain dependency.
- **TruffleHog**: More powerful but heavier; better suited for historical scans than lightweight pre-commit checks.

secretlint is a Node.js-native tool that integrates naturally with the existing npm-based workflow and husky setup.

## Consequences

- Every commit will run secretlint; commits containing detected secrets will be blocked.
- CI will fail if a secret is pushed despite the local hook being bypassed (e.g. `--no-verify`).
- Developers must run `npm install` to get the new devDependencies before the hook functions correctly.
- False positives may occasionally block a commit; the rule preset or ignore patterns can be tuned in `.secretlintrc.json` as needed.
