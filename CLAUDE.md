# CLAUDE.md

This file defines guidelines for Claude Code when working in this repository.

## Architecture Decision Records (ADR)

### Reference

**Always read `docs/adr/README.md` before discussing any design/spec decision or starting implementation. This is an absolute rule.**
The ADR list and statuses in `docs/adr/README.md` are the single source of truth.

When to check:
- When the user asks for design or specification advice (before implementation)
- Before writing any code
- When changing existing behavior

### Update Rules

Create or update an ADR whenever any of the following apply.
**ADR updates must be included in the same commit as the code changes. Do not reply after completing a task without having done this.**

| Type of change | Action |
| --- | --- |
| New design decision (library selection, algorithm, data structure, etc.) | Add a new ADR |
| Change that overrides an existing decision | Update the existing ADR status to "Superseded (by ADR-XXXX)" and add a new ADR |
| Change to detection heuristics | Add a new ADR |
| Implementation change within scope of an existing decision | No ADR update needed. Change code and tests only |
| Bug fix | No ADR update needed |

### Creating a New ADR

1. Assign a sequential number: max existing number + 1 in `docs/adr/`
2. Filename: `NNNN-kebab-case-title.md`
3. Use the following template:

```markdown
# ADR-NNNN: Title

## Status

Accepted

## Context

<!-- Background, requirements, and constraints that led to this decision -->

## Decision

<!-- What was chosen. Including a comparison of alternatives is recommended -->

## Consequences

<!-- Trade-offs, constraints, and future improvement points resulting from this decision -->
```

4. Append an entry to the table in `docs/adr/README.md` (no changes to CLAUDE.md needed)

## README Update Rules

Update **README.md** whenever any of the following changes are made:

| Type of change | Section to update in README |
| --- | --- |
| Public API added / changed / removed | API section |
| Option added / changed / removed | Options section, default values table |
| Region detection algorithm changed | Content Detection section |
| Table or paragraph output format changed | Table Formatting Details / Rich Text section |
| Development command added / changed | Development section |

Include README updates in the same commit as the code changes.

## Development Commands

```bash
npm test            # Run tests (vitest)
npm run build       # Compile TypeScript → dist/
npm run test:watch  # Run tests in watch mode
npm run lint        # oxlint
npm run fmt         # oxfmt (overwrite)
npm run fmt:check   # Format check (for CI)
```

## Code Conventions

- Edit sources under `src/`; do not edit `dist/` directly (it is build output)
- Centralize public API types in `src/types.ts`
- Place tests in `src/__tests__/` with filenames `*.test.ts`
- Add corresponding tests when adding new features
- **Validate markdown strings with `toBe` for exact matching**: when asserting on `markdown` / `sheets[i].markdown` returned by `convertWorkbook`, use `toBe` to compare the full output rather than `toContain`

## Current Architecture Overview

```
src/
  types.ts              — All type definitions (ConvertOptions, CellData, Region, etc.)
  options.ts            — Resolve options by filling in default values
  cell-formatter.ts     — Cell value extraction and format conversion
                          rawValue: raw text (used by the HTML renderer)
                          value:    Markdown-formatted text (used by the paragraph renderer)
  region-detector.ts    — Table/paragraph region detection via row→column→recursive scan (supports side-by-side tables)
  table-renderer.ts     — HTML table output (colspan/rowspan support)
  paragraph-renderer.ts — Markdown paragraph output
  sheet-converter.ts    — Sheet-level conversion orchestration
  index.ts              — Public API
```

### Key Design Points

- **Tables output as HTML**: `<table>`/`<thead>`/`<tbody>` + colspan/rowspan (see `docs/adr/`)
- **Paragraphs output as Markdown**: plain text + `**bold**`, `_italic_` syntax
- **rawValue vs value separation**: `CellData.rawValue` is the raw text before HTML escaping; `CellData.value` is the Markdown-formatted text. The table renderer uses `rawValue` and applies HTML tags
- **Region detection**: row→column→recursive scan. Empty columns act as gaps to separate side-by-side tables. Thresholds are adjustable via `minColumns` / `minRows`
