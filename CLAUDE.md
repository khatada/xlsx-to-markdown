# CLAUDE.md

This file defines guidelines for Claude Code when working in this repository.

## Language Rule

**All documentation, comments, ADRs, and CLAUDE.md must be written in English.** This applies to:
- Source code comments
- ADR files (`docs/adr/`)
- This file (CLAUDE.md)
- Skill files (`.claude/skills/`)
- README.md

## Architecture Decision Records (ADR)

Use the `/adr` skill for all ADR operations. Full rules, templates, and procedures are defined in `.claude/skills/adr/SKILL.md`.

**Key rules:**
- Always invoke the `adr` skill (proactive-check) before any design discussion or before writing code.
- ADR updates must be in the same commit as code changes.
- `docs/adr/README.md` is the single source of truth for ADR list and statuses.

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
npm run secretlint  # Scan for secrets
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
