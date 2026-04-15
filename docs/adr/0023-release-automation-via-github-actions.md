# ADR-0023: Release Automation via GitHub Actions

## Status

Superseded (by [ADR-0024](0024-npm-publish-via-oidc-provenance.md))

## Context

The project needed a repeatable, automated release process that:
- Bumps `package.json` (and `package-lock.json`) to the new version
- Creates a signed git tag and pushes it
- Publishes the package to the npm registry
- Creates a GitHub Release with auto-generated release notes

Doing this manually is error-prone (forgetting to bump the version, forgetting to push tags, etc.).

## Decision

Add a `release.yml` GitHub Actions workflow triggered by `workflow_dispatch` with a required `version` input (semver string, e.g. `1.0.0`).

The workflow:
1. Runs full CI checks (lint, format, secretlint, tests) before releasing
2. Uses `npm version <input>` to bump both `package.json` and `package-lock.json`, commit, and create a local tag
3. Pushes the commit and tag with `git push --follow-tags`
4. Builds the TypeScript output with `npm run build`
5. Creates a GitHub Release via the pre-installed `gh` CLI with `--generate-notes`
6. Publishes to npm using `npm publish` with the `NPM_TOKEN` repository secret

The `NPM_TOKEN` secret must be set in repository Settings → Secrets and variables → Actions before the workflow can publish.

## Consequences

- Releases are reproducible and auditable via Actions logs
- CI checks are enforced on every release; a failing test or lint error blocks the release
- Requires `NPM_TOKEN` to be kept up-to-date as a repository secret
- The workflow pushes a version-bump commit directly to the branch it is run from; it should always be run from `main`
