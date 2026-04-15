# ADR-0024: Publish to npm via OIDC Provenance (no long-lived NPM_TOKEN)

## Status

Accepted

## Context

ADR-0023 adopted a `release.yml` workflow that published to npm using a long-lived
`NPM_TOKEN` repository secret (`NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`).

Long-lived tokens carry several risks:
- They must be rotated manually when compromised or expired.
- They grant broad publish access and are hard to scope tightly.
- A leaked `NPM_TOKEN` allows anyone to publish arbitrary versions.

npm registry supports **Provenance** (OIDC-based attestation) combined with
**Trusted Publishers**, which lets a GitHub Actions workflow authenticate to
npmjs.com using GitHub's short-lived OIDC token instead of a stored secret.

## Decision

Replace the `NPM_TOKEN`-based `npm publish` step with a provenance-based
`npm publish --provenance --access public`, and add `id-token: write` to the
job's permissions block.

Key changes to `release.yml`:

```yaml
permissions:
  contents: write
  id-token: write        # Grant OIDC token to the job

# setup-node still sets registry-url so npm knows the target registry
- uses: actions/setup-node@v4
  with:
    registry-url: "https://registry.npmjs.org"

- name: Publish to npm
  run: npm publish --provenance --access public
  # NODE_AUTH_TOKEN / NPM_TOKEN removed
```

**One-time setup required on npmjs.com:**
Go to the package's Access settings on npmjs.com → "Publishing access" →
enable "Granular Access Tokens / OIDC" or configure a Trusted Publisher linked
to the `khatada/xlsx-to-markdown` repository and the `release.yml` workflow.
This allows the OIDC exchange to authenticate without any stored secret.

## Consequences

- No `NPM_TOKEN` secret is stored in repository settings; reduces secret sprawl.
- Each publish is cryptographically linked to the exact commit and workflow run
  (provenance attestation visible on npmjs.com).
- Requires the one-time Trusted Publisher configuration on npmjs.com before the
  first provenance-based publish succeeds.
- `id-token: write` is a sensitive permission; it is scoped to this job only and
  does not affect other jobs.
