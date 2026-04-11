# ADR-0020: Escape Markdown special characters in sheet name headings

## Status

Accepted
Supersedes [ADR-0006](0006-multi-sheet-headings.md)

## Context

ADR-0006 introduced automatic `## Sheet Name` headings for multi-sheet workbooks and noted:

> If sheet names contain Markdown special characters (e.g., `#`, `*`), they are not currently
> escaped. Recorded as a future improvement.

A sheet name like `_italic_` or `` code`snippet `` would be interpreted as Markdown inline
syntax inside the heading, altering the rendered output. While Excel forbids `* [ ] \ / ? :`
in sheet names, characters such as `_`, `` ` ``, `<`, `>`, and `!` are permitted and are
meaningful in Markdown.

## Decision

Apply `escapeMarkdownHeading()` to the sheet name before inserting it into the `## …` heading:

```typescript
function escapeMarkdownHeading(name: string): string {
  return name.replace(/[\\*_`[\]<>!]/g, "\\$&");
}
```

The escaped characters are: `\`, `*`, `_`, `` ` ``, `[`, `]`, `<`, `>`, `!`.

- `*` and `[` `]` are already forbidden by Excel, but are included defensively.
- `#` is not escaped; a `#` inside a heading body is not reinterpreted as a new heading level
  in CommonMark, and the character is used in common sheet names (e.g., `Summary #1`).

## Consequences

- Sheet names with `_`, `` ` ``, `<>`, or `!` are now rendered literally in Markdown
- The change is backward-compatible for sheet names that do not contain the escaped characters
- Sheet names using `#` (e.g., `#Summary`) continue to render as `## #Summary`, which is
  valid CommonMark
